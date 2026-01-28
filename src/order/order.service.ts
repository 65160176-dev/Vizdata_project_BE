
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
import { Cart, CartDocument } from 'src/database/schemas/cart.schema';
import { Affiliate, AffiliateDocument } from 'src/affiliate/entities/affiliate.entity';
import { AffiliateOrder, AffiliateOrderDocument } from 'src/affiliate/entities/affiliate-order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Seller.name) private sellerModel: Model<SellerDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Affiliate.name) private affiliateModel: Model<AffiliateDocument>,
    @InjectModel(AffiliateOrder.name) private affiliateOrderModel: Model<AffiliateOrderDocument>,
    private productService: ProductService,
    private notificationService: NotificationService,
  ) { }

  // 1. Create Order
  async create(createOrderDto: CreateOrderDto) {
    const { item, orderId, ...orderData } = createOrderDto;
    const ordersBySeller = new Map<string, any[]>();

    // 1.1 Check products
    for (const orderItem of item) {
      const product = await this.productService.findOne(orderItem.productId);
      if (!product) {
        throw new NotFoundException(
          `Product not found: ${orderItem.productId}`,
        );
      }

      // ❌ [แก้ไข] เอาออก: ไม่ตัดสต็อกตอนสร้าง Order แล้ว (ย้ายไปตัดตอนร้านกดรับ)
      // await this.productService.decreaseStock(
      //   orderItem.productId,
      //   orderItem.qty,
      // );

      const sellerId = product.userId.toString();
      if (!ordersBySeller.has(sellerId)) ordersBySeller.set(sellerId, []);
      ordersBySeller.get(sellerId)!.push({
        ...orderItem,
        originalProduct: product,
      });
    }

    const createdOrders: any[] = [];
    let subIndex = 1;

    // 1.2 Create actual orders
    for (const [sellerId, sellerItems] of ordersBySeller) {
      const subTotal = sellerItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      const subShipping = sellerItems.reduce(
        (sum, i) => sum + (i.originalProduct.shippingCost || 0),
        0,
      );
      const splitId =
        ordersBySeller.size > 1 ? `${orderId}-${subIndex}` : orderId;

      const orderPayload: any = {
        ...orderData,
        orderId: splitId,
        seller: sellerId,
        item: sellerItems.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          image: i.image || i.originalProduct?.image || '',
        })),
        total: subTotal + subShipping,
        shippingCost: subShipping,
      };

      // Affiliate Logic
      if (orderData && orderData.affiliateId) {
        try {
          let affiliate: AffiliateDocument | null = null;
          if (Types.ObjectId.isValid(orderData.affiliateId)) {
            affiliate = await this.affiliateModel.findById(orderData.affiliateId).exec();
          } else {
            const code = String(orderData.affiliateId).toUpperCase();
            affiliate = await this.affiliateModel.findOne({ code }).exec();
          }

          if (affiliate) {
            const validAffiliate = affiliate as AffiliateDocument;
            orderPayload.affiliate = validAffiliate._id;
          }
        } catch (e) {
          console.error('Error finding affiliate:', e);
        }
      }

      const newOrder = new this.orderModel(orderPayload);
      const savedOrder = await newOrder.save();
      createdOrders.push(savedOrder);

      // Send initial notification
      this.sendOrderNotifications(savedOrder).catch((err) =>
        console.error(`Notification Error for Order ${splitId}:`, err.message),
      );

      // Affiliate Commission Logic
      if (orderPayload.affiliate) {
        try {
          let affiliate: AffiliateDocument | null = null;
          if (orderData.affiliateId && Types.ObjectId.isValid(orderData.affiliateId)) {
            affiliate = await this.affiliateModel.findById(orderData.affiliateId);
          } else {
            const code = orderData.affiliateId ? String(orderData.affiliateId).toUpperCase() : null;
            affiliate = code ? await this.affiliateModel.findOne({ code }) : await this.affiliateModel.findById(orderPayload.affiliate);
          }

          if (affiliate) {
            const validAffiliate = affiliate as AffiliateDocument;
            let commissionAmount = 0;
            const itemsForRecord = sellerItems.map((i) => ({
              productId: i.productId,
              name: i.name,
              price: i.price,
              qty: i.qty,
            }));

            for (const it of sellerItems) {
              const prod = it.originalProduct;
              const qty = it.qty || 1;
              const perUnit = (prod && prod.commission) ? Number(prod.commission) : 0;
              commissionAmount += perUnit * qty;
            }

            const affOrder = new this.affiliateOrderModel({
              order: savedOrder._id,
              affiliate: validAffiliate._id,
              amount: subTotal,
              commissionAmount,
              status: 'pending',
              items: itemsForRecord,
            });

            await affOrder.save();
          }
        } catch (err) {
          console.error('❌ Failed to create AffiliateOrder:', err);
        }
      }
      subIndex++;
    }

    // 1.3 Cleanup Cart
    if (orderData.user) {
      try {
        const userIdString = orderData.user.toString();
        const orderedProductIds = item.map((i) =>
          Types.ObjectId.isValid(i.productId)
            ? new Types.ObjectId(i.productId)
            : i.productId,
        );
        const userObjId = Types.ObjectId.isValid(userIdString)
          ? new Types.ObjectId(userIdString)
          : null;

        const queryConditions: any[] = [
          { userId: userIdString },
          { user: userIdString },
        ];
        if (userObjId) {
          queryConditions.push({ userId: userObjId });
          queryConditions.push({ user: userObjId });
        }

        const cartExists = await this.cartModel.findOne({
          $or: queryConditions,
        });
        if (cartExists) {
          await this.cartModel
            .updateOne(
              { _id: cartExists._id },
              { $pull: { items: { productId: { $in: orderedProductIds } } } },
            )
            .exec();
        }
      } catch (error) {
        console.error('Failed to clear cart:', error);
      }
    }

    return createdOrders;
  }

  // 2. Notification Helper
  async sendOrderNotifications(order: any) {
    try {
      // 1. ส่งหาคนซื้อ
      if (order.user) {
        const buyerId = order.user.toString();
        await this.notificationService.createAndSend(
          buyerId,
          'รอการยืนยันคำสั่งซื้อจากผู้ขาย',
          `คำสั่งซื้อ #${order.orderId || order._id} อยู่ระหว่างรอการตอบรับจากร้านค้า`,
          'order',
          { orderId: order.orderId || order._id, role: 'buyer' },
          order.item?.[0]?.image || ''
        );
      }

      // 2. ส่งหาคนขาย (พร้อมเช็คว่าไม่ใช่คนเดียวกับคนซื้อ)
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

          // ✅ ป้องกันส่งซ้ำตอน Create Order กรณีเทสด้วยไอดีเดียวกัน
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

  // 3. Find All
  async findAll() {
    return this.orderModel
      .find()
      .populate('user', 'firstName lastName email')
      .populate({
        path: 'item.productId',
        select: 'name price userId image',
        populate: { path: 'userId', select: 'name shopName username image' },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // 4. Find One
  async findOne(id: string) {
    let condition: any = { orderId: id };
    if (Types.ObjectId.isValid(id)) {
      condition = { $or: [{ _id: id }, { orderId: id }] };
    }
    const order = await this.orderModel
      .findOne(condition)
      .populate('user')
      .populate({ path: 'item.productId', populate: { path: 'userId' } })
      .exec();

    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
    return order;
  }

  // 5. Update (✅ FIX: เพิ่ม Logic ตัด/คืนสต็อก + Notification Duplicate Fix)
  async update(id: string, updateOrderDto: any) {
    if (!updateOrderDto || Object.keys(updateOrderDto).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    // 1. ดึง Order เก่ามาก่อน
    let condition: any = { orderId: id };
    if (Types.ObjectId.isValid(id)) {
      condition = { $or: [{ _id: id }, { orderId: id }] };
    }
    const oldOrder = await this.orderModel.findOne(condition).exec();

    if (!oldOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // ✅✅ FIX: เช็คว่าสถานะมีการเปลี่ยนแปลงจริงหรือไม่? (ป้องกัน Race Condition/Double Click)
    const isStatusChanged = updateOrderDto.status && (oldOrder.status !== updateOrderDto.status);

    // ✅✅ จัดการ Stock เมื่อสถานะเปลี่ยน ✅✅
    if (isStatusChanged) {
      const newStatus = updateOrderDto.status.toLowerCase();
      const oldStatus = oldOrder.status.toLowerCase();

      // 1. ตัดสต็อก: เมื่อร้านค้ากดรับ (เปลี่ยนจาก Pending/Review -> Preparing/Processing/Confirmed)
      const isShopAccepting =
        (oldStatus === 'pending' || oldStatus === 'pending review') &&
        (newStatus === 'preparing' || newStatus === 'processing' || newStatus === 'confirmed' || newStatus === 'accepted');

      if (isShopAccepting) {
        for (const item of oldOrder.item) {
          // ตัดสต็อกเมื่อร้านรับ
          await this.productService.decreaseStock(item.productId, item.qty);
        }
      }

      // 2. คืนสต็อก: เมื่อยกเลิกสำเร็จ (Cancelled)
      // เงื่อนไข: ต้องคืนก็ต่อเมื่อสถานะก่อนหน้า *ไม่ใช่* Pending (เพราะ Pending ยังไม่ได้ตัดของ)
      const isCancelling = (newStatus === 'cancelled' || newStatus === 'cancel');
      const wasStockDeducted = !(oldStatus === 'pending' || oldStatus === 'pending review');

      if (isCancelling && wasStockDeducted) {
        for (const item of oldOrder.item) {
          // คืนสต็อกเมื่อยกเลิก (และเคยถูกตัดไปแล้ว)
          await this.productService.increaseStock(item.productId, item.qty);
        }
      }
    }

    // 2. อัปเดตข้อมูล
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(
        oldOrder._id,
        { $set: updateOrderDto },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} failed to update`);
    }

    // 3. Trigger Notification (ทำเฉพาะตอนที่สถานะเปลี่ยนเท่านั้น)
    if (isStatusChanged) {
      this.handleStatusChangeNotification(updatedOrder, updateOrderDto.status, oldOrder.status);
    }

    // Affiliate Commission Logic
    if (isStatusChanged) {
      const newStatus = updateOrderDto.status.toLowerCase();
      if (newStatus === 'delivered' || newStatus === 'completed') {
        await this.affiliateOrderModel.updateMany(
          { order: updatedOrder._id },
          { $set: { status: 'paid' } },
        );
      }
      if (newStatus === 'cancelled') {
        await this.affiliateOrderModel.updateMany(
          { order: updatedOrder._id },
          { $set: { status: 'cancelled' } },
        );
      }
    }
    return updatedOrder;
  }

  // 6. Status Change Notification
  async handleStatusChangeNotification(order: any, status: string, previousStatus: string = '') {
    try {
      const statusLower = status.toLowerCase();
      const prevStatusLower = (previousStatus || '').toLowerCase();
      let titleBuyer = '';
      let msgBuyer = '';
      let titleSeller = '';
      let msgSeller = '';

      // 0. ร้านค้าปฏิเสธคำขอ
      if (
        (prevStatusLower.includes('request') || prevStatusLower.includes('return') || prevStatusLower.includes('cancel')) &&
        (statusLower === 'preparing' || statusLower === 'processing')
      ) {
        titleBuyer = 'ร้านค้าปฏิเสธคำร้องขอ ❌';
        msgBuyer = `ร้านค้าได้ปฏิเสธคำขอยกเลิก/คืนสินค้าสำหรับออเดอร์ #${order.orderId} และจะดำเนินการจัดเตรียมสินค้าต่อ`;

        // 1. ขอยกเลิก
      } else if (
        statusLower === 'cancel requested' ||
        statusLower === 'cancellation requested' ||
        statusLower === 'return_requested' ||
        statusLower === 'return requested'
      ) {
        titleBuyer = 'ส่งคำขอตรวจสอบแล้ว';
        msgBuyer = `คำร้องขอสำหรับออเดอร์ #${order.orderId} ถูกส่งไปยังร้านค้าแล้ว กรุณารอการอนุมัติ`;
        titleSeller = '⚠️ มีคำขอยกเลิก/คืนสินค้า';
        msgSeller = `ออเดอร์ #${order.orderId} มีการแจ้งปัญหาหรือขอยกเลิก กรุณาตรวจสอบ`;

        // 2. ยกเลิกสำเร็จ
      } else if (statusLower === 'cancelled' || statusLower === 'cancel') {
        titleBuyer = 'คำสั่งซื้อถูกยกเลิก';
        msgBuyer = `คำสั่งซื้อ #${order.orderId} ถูกยกเลิกเรียบร้อยแล้ว`;
        titleSeller = '🚫 คำสั่งซื้อถูกยกเลิก';
        msgSeller = `คำสั่งซื้อ #${order.orderId} ถูกยกเลิกโดยผู้ซื้อ/ระบบ`;

        // 3. ร้านรับออเดอร์
      } else if (
        statusLower === 'accepted' ||
        statusLower === 'processing' ||
        statusLower === 'preparing' ||
        statusLower === 'prepared' ||
        statusLower === 'confirmed'
      ) {
        titleBuyer = 'ร้านค้ารับคำสั่งซื้อแล้ว ✅';
        msgBuyer = `ร้านค้าได้รับออเดอร์ #${order.orderId} แล้วและกำลังเตรียมสินค้า`;

        // 4. จัดส่ง
      } else if (statusLower === 'shipped' || statusLower === 'shipping') {
        titleBuyer = 'สินค้าถูกจัดส่งแล้ว 🚚';
        msgBuyer = `ออเดอร์ #${order.orderId} อยู่ระหว่างการจัดส่ง`;

        // 5. สำเร็จ
      } else if (statusLower === 'completed' || statusLower === 'delivered') {
        titleBuyer = 'คำสั่งซื้อเสร็จสมบูรณ์';
        msgBuyer = `ขอบคุณที่สั่งซื้อสินค้า ออเดอร์ #${order.orderId} สำเร็จเรียบร้อย`;
        titleSeller = 'ออเดอร์สำเร็จ 🎉';
        msgSeller = `ออเดอร์ #${order.orderId} ลูกค้าได้รับสินค้าและกดยอมรับแล้ว`;
      }

      // --- Send Notification ---

      // 1. Buyer
      const buyerId = (order.user._id || order.user).toString();
      if (titleBuyer && order.user) {
        await this.notificationService.createAndSend(
          buyerId,
          titleBuyer,
          msgBuyer,
          'order',
          { orderId: order.orderId || order._id, role: 'buyer' },
          order.item?.[0]?.image || ''
        );
      }

      // 2. Seller
      if (titleSeller && order.seller) {
        const sellerId = order.seller.toString();
        const queryConditions: any[] = [{ userId: sellerId }, { _id: sellerId }];
        if (Types.ObjectId.isValid(sellerId)) {
          const sId = new Types.ObjectId(sellerId);
          queryConditions.push({ userId: sId }, { _id: sId });
        }

        const shop = await this.sellerModel.findOne({ $or: queryConditions }).exec();

        if (shop && shop.userId) {
          const ownerId = shop.userId.toString();

          // ✅✅ FIX: เช็คว่าคนขาย (Owner) ต้องไม่ใช่คนเดียวกับคนซื้อ (Buyer)
          if (ownerId !== buyerId) {
            await this.notificationService.createAndSend(
              ownerId,
              titleSeller,
              msgSeller,
              'order',
              { orderId: order.orderId || order._id, role: 'seller', shopId: shop._id },
              order.item?.[0]?.image || ''
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to send status notification:', error);
    }
  }

  async remove(id: string) {
    const result = await this.orderModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Order with ID ${id} not found`);
    return { deleted: true };
  }
}