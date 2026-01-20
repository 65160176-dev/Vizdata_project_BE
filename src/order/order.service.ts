import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProductService } from '../product/product.service';
import { Seller, SellerDocument } from 'src/database/schemas/seller.schema';
import { NotificationService } from 'src/notification/notification.service';
// ✅ Import Cart Document เพื่อใช้ลบของออกจากตะกร้า
import { Cart, CartDocument } from 'src/database/schemas/cart.schema';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Seller.name) private sellerModel: Model<SellerDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>, // ✅ Inject Cart Model
    private productService: ProductService,
    private notificationService: NotificationService,
  ) { }

  // ✅ 1. ฟังก์ชันสร้างออเดอร์ (ตัวหลัก)
  async create(createOrderDto: CreateOrderDto) {
    const { item, orderId, ...orderData } = createOrderDto;

    const ordersBySeller = new Map<string, any[]>();

    // ---------------------------------------------------------
    // 1.1 วนลูปสินค้าเพื่อ: เช็คสินค้า / ตัดสต็อก / แยกกลุ่มตามร้าน
    // ---------------------------------------------------------
    for (const orderItem of item) {
      const product = await this.productService.findOne(orderItem.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${orderItem.productId}`);
      }

      // ✅ ตัดสต็อกสินค้าทันที
      await this.productService.decreaseStock(
        orderItem.productId,
        orderItem.qty,
      );

      // ดึง ID เจ้าของสินค้า (Seller)
      const sellerId = product.userId.toString();

      if (!ordersBySeller.has(sellerId)) {
        ordersBySeller.set(sellerId, []);
      }

      ordersBySeller.get(sellerId)!.push({
        ...orderItem,
        originalProduct: product, // เก็บข้อมูลเดิมไว้ใช้อ้างอิง
      });
    }

    const createdOrders: any[] = [];
    let subIndex = 1;

    // ---------------------------------------------------------
    // 1.2 วนลูปสร้าง Order จริง แยกตามร้านค้า
    // ---------------------------------------------------------
    for (const [sellerId, sellerItems] of ordersBySeller) {
      // คำนวณยอดรวมย่อย
      const subTotal = sellerItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      const subShipping = sellerItems.reduce(
        (sum, i) => sum + (i.originalProduct.shippingCost || 0),
        0,
      );

      // สร้าง Order ID ย่อย (เช่น ORD-123-1, ORD-123-2)
      const splitId =
        ordersBySeller.size > 1 ? `${orderId}-${subIndex}` : orderId;

      const newOrder = new this.orderModel({
        ...orderData,
        orderId: splitId,
        seller: sellerId,
        item: sellerItems.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          image: i.image,
        })),
        total: subTotal,
        shippingCost: subShipping,
      });

      const savedOrder = await newOrder.save();
      createdOrders.push(savedOrder);

      // ส่งแจ้งเตือนทันที
      this.sendOrderNotifications(savedOrder).catch((err) =>
        console.error(`Notification Error for Order ${splitId}:`, err.message),
      );

      subIndex++;
    }

    // ---------------------------------------------------------
    // ✅✅ 1.3 Debug & Fix: ลบสินค้าออกจากตะกร้า (Version 2 - แก้เรื่องหา Cart ไม่เจอ)
    // ---------------------------------------------------------
    if (orderData.user) {
      try {
        const userIdString = orderData.user.toString();

        // 1. แปลง Product ID เป็น ObjectId (เหมือนเดิม)
        const orderedProductIds = item.map((i) => {
          return Types.ObjectId.isValid(i.productId)
            ? new Types.ObjectId(i.productId)
            : i.productId;
        });

        // ✅ 2. (เพิ่มใหม่) แปลง User ID เป็น ObjectId ด้วย เพื่อให้หาเจอชัวร์ๆ
        const userObjId = Types.ObjectId.isValid(userIdString)
          ? new Types.ObjectId(userIdString)
          : null;

        console.log('------------ CART CLEANUP DEBUG V2 ------------');
        console.log('User ID (String):', userIdString);
        console.log('User ID (ObjectId):', userObjId);

        // 3. Query แบบครอบจักรวาล (หาทั้ง String และ ObjectId, หาหัวข้อ userId และ user)
        const queryConditions: any[] = [
          { userId: userIdString },
          { user: userIdString }
        ];

        if (userObjId) {
          queryConditions.push({ userId: userObjId });
          queryConditions.push({ user: userObjId });
        }

        const cartExists = await this.cartModel.findOne({
          $or: queryConditions
        });

        if (!cartExists) {
          console.log('❌ ยังหาไม่เจออีก! กรุณาเช็คชื่อ field ใน Database ว่าชื่อ "userId", "user", หรือ "owner"?');
        } else {
          console.log('✅ เย้! เจอตะกร้าแล้ว ID:', cartExists._id);

          // 4. สั่งลบจริง
          const updateResult = await this.cartModel.updateOne(
            { _id: cartExists._id },
            {
              $pull: {
                items: {
                  productId: { $in: orderedProductIds }
                },
              },
            },
          ).exec();

          console.log('Update Result:', updateResult);

          if (updateResult.modifiedCount > 0) {
            console.log('🎉 ลบสินค้าสำเร็จเรียบร้อย!');
          } else {
            console.log('⚠️ เจอตะกร้าแล้ว แต่ลบสินค้าไม่ได้ (ลองเช็ค Product ID ในตะกร้าว่าตรงกับที่สั่งไหม)');
          }
        }
        console.log('--------------------------------------------');

      } catch (error) {
        console.error('Failed to clear cart:', error);
      }
    }

    return createdOrders;
  }

  // ✅ 2. ฟังก์ชันส่งแจ้งเตือน
  async sendOrderNotifications(order: any) {
    try {
      // แจ้งเตือนคนซื้อ
      if (order.user) {
        const buyerId = order.user.toString();
        await this.notificationService.createAndSend(
          buyerId,
          'รอการยืนยันจากผู้ขาย',
          `คำสั่งซื้อ #${order.orderId || order._id} อยู่ระหว่างรอการตอบรับจากร้านค้า`,
          'order',
          { orderId: order.orderId || order._id, role: 'buyer' },
        );
      }

      // แจ้งเตือนคนขาย
      const sellerId = order.seller;
      if (sellerId) {
        const idString = sellerId.toString();
        const queryConditions: any[] = [
          { userId: idString },
          { _id: idString },
        ];

        if (Types.ObjectId.isValid(idString)) {
          const idObj = new Types.ObjectId(idString);
          queryConditions.push({ userId: idObj });
          queryConditions.push({ _id: idObj });
        }

        const shop = await this.sellerModel
          .findOne({ $or: queryConditions })
          .exec();

        if (shop && shop.userId) {
          const ownerId = shop.userId.toString();
          // ป้องกันแจ้งเตือนตัวเอง
          if (ownerId !== order.user?.toString()) {
            await this.notificationService.createAndSend(
              ownerId,
              'คำสั่งซื้อใหม่ 📦',
              `คุณได้รับคำสั่งซื้อใหม่ #${order.orderId} ที่ร้าน ${shop.display_name || 'ของคุณ'}`,
              'order',
              {
                orderId: order.orderId || order._id,
                role: 'seller',
                shopId: shop._id.toString(),
              },
              order.item && order.item[0] ? order.item[0].image : '',
            );
          }
        }
      }
    } catch (error) {
      console.error('Notification Error:', error);
    }
  }

  // ✅ 3. Helper Functions (Standard CRUD)

  async findAll() {
    return this.orderModel
      .find()
      .populate('user', 'firstName lastName email')
      .populate({
        path: 'item.productId',
        select: 'name price userId image',
        populate: {
          path: 'userId',
          select: 'name shopName username image',
        },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string) {
    const order = await this.orderModel
      .findById(id)
      .populate('user')
      .populate({
        path: 'item.productId',
        populate: { path: 'userId' },
      })
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async update(id: string, updateOrderDto: any) {
    if (!updateOrderDto || Object.keys(updateOrderDto).length === 0) {
      throw new BadRequestException('No data provided for update');
    }
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        id,
        { $set: updateOrderDto },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return updatedOrder;
  }

  async remove(id: string) {
    const result = await this.orderModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return { deleted: true };
  }
}