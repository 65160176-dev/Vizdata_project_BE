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

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Seller.name) private sellerModel: Model<SellerDocument>,
    private productService: ProductService,
    private notificationService: NotificationService,
  ) { }

  // ✅ 1. ฟังก์ชัน Create แบบ "Split Order" + "Notification"
  async create(createOrderDto: CreateOrderDto) {
    const { item, orderId, ...orderData } = createOrderDto;

    // ตัวแปรสำหรับแยกออเดอร์ตาม Seller ID
    const ordersBySeller = new Map<string, any[]>();

    // 1.1 วนลูปสินค้าเพื่อแยกกลุ่มตามร้านค้า (Seller)
    for (const orderItem of item) {
      const product = await this.productService.findOne(orderItem.productId);
      if (!product) throw new NotFoundException(`Product not found: ${orderItem.productId}`);

      // ดึง ID เจ้าของสินค้า (Seller/User ID)
      const sellerId = product.userId.toString();

      if (!ordersBySeller.has(sellerId)) {
        ordersBySeller.set(sellerId, []);
      }

      ordersBySeller.get(sellerId)!.push({
        ...orderItem,
        originalProduct: product, // เก็บข้อมูลสินค้าเดิมไว้คำนวณค่าส่ง
      });
    }

    const createdOrders: any[] = [];
    let subIndex = 1;

    // 1.2 วนลูปสร้าง Order แยกตามร้านค้า
    for (const [sellerId, sellerItems] of ordersBySeller) {
      // คำนวณยอดรวมย่อย
      const subTotal = sellerItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      const subShipping = sellerItems.reduce((sum, i) => sum + (i.originalProduct.shippingCost || 0), 0);

      // สร้าง Order ID ย่อย (ถ้ามีหลายร้านให้เติม -1, -2)
      const splitId = ordersBySeller.size > 1 ? `${orderId}-${subIndex}` : orderId;

      const newOrder = new this.orderModel({
        ...orderData,
        orderId: splitId,
        seller: sellerId, // ✅ บันทึก Seller ID ลงใน Order ด้วย
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

      // 1.3 บันทึก Order
      const savedOrder = await newOrder.save();
      createdOrders.push(savedOrder);

      // 1.4 ✅✅ ส่งแจ้งเตือนทันที (แยกตามออเดอร์ย่อย)
      this.sendOrderNotifications(savedOrder).catch((err) =>
        console.error(`Notification Error for Order ${splitId}:`, err.message),
      );

      subIndex++;
    }

    return createdOrders;
  }

  // ✅ 2. ฟังก์ชันส่งแจ้งเตือน (Logic จากไฟล์ที่ 2)
  async sendOrderNotifications(order: any) {
    try {
      // --- แจ้งเตือนคนซื้อ (Buyer) ---
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

      // --- แจ้งเตือนคนขาย (Seller) ---
      const sellerId = order.seller;

      if (sellerId) {
        // Smart Search: หาจาก _id หรือ userId
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

        const shop = await this.sellerModel.findOne({ $or: queryConditions }).exec();

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

  // ✅ 3. Helper Functions (findAll, findOne, update, remove)

  async findAll() {
    return this.orderModel
      .find()
      .populate('user', 'firstName lastName email')
      .populate({
        path: 'item.productId',
        select: 'name price userId image',
        populate: {
          path: 'userId',
          select: 'name shopName username image', // รวม field ที่จำเป็น
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
      .findByIdAndUpdate(id, { $set: updateOrderDto }, { new: true, runValidators: true })
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