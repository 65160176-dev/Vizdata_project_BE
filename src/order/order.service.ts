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
// ✅ Import Wallet
import { Wallet, WalletDocument } from 'src/wallet/entities/wallet.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Seller.name) private sellerModel: Model<SellerDocument>,
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Affiliate.name) private affiliateModel: Model<AffiliateDocument>,
    @InjectModel(AffiliateOrder.name) private affiliateOrderModel: Model<AffiliateOrderDocument>,
    // ✅ Inject Wallet Model
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,

    private productService: ProductService,
    private notificationService: NotificationService,
  ) { }

  // ... (ส่วน create เหมือนเดิม ไม่ต้องแก้) ...
  async create(createOrderDto: CreateOrderDto) {
    const { item, orderId, ...orderData } = createOrderDto;
    const ordersBySeller = new Map<string, any[]>();

    for (const orderItem of item) {
      const product = await this.productService.findOne(orderItem.productId);
      if (!product) throw new NotFoundException(`Product not found: ${orderItem.productId}`);
      const sellerId = product.userId.toString();
      if (!ordersBySeller.has(sellerId)) ordersBySeller.set(sellerId, []);
      ordersBySeller.get(sellerId)!.push({ ...orderItem, originalProduct: product });
    }

    const createdOrders: any[] = [];
    let subIndex = 1;

    for (const [sellerId, sellerItems] of ordersBySeller) {
      const subTotal = sellerItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      const subShipping = sellerItems.reduce((sum, i) => sum + (i.originalProduct.shippingCost || 0), 0);
      const splitId = ordersBySeller.size > 1 ? `${orderId}-${subIndex}` : orderId;
      const platformFee = subTotal * 0.03;

      let totalAffiliateCommission = 0;
      const itemsWithAffiliate = sellerItems.filter((i: any) => {
        const ref = i?.refAffiliateId || i?.refAffiliateID || i?.refAffiliate || i?.item?.refAffiliateId;
        return !!ref;
      });

      if (itemsWithAffiliate.length > 0) {
        for (const it of itemsWithAffiliate) {
          const prod = it.originalProduct;
          const qty = it.qty || 1;
          const itemPrice = it.price || 0;
          const commissionRate = (prod && prod.commission) ? Number(prod.commission) : 0;
          totalAffiliateCommission += (itemPrice * qty * commissionRate) / 100;
        }
      }

      const sellerEarnings = subTotal - platformFee - totalAffiliateCommission;

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
        platformFee,
        affiliateCommission: totalAffiliateCommission,
        sellerEarnings,
      };

      const newOrder = new this.orderModel(orderPayload);
      const savedOrder = await newOrder.save();
      createdOrders.push(savedOrder);

      this.sendOrderNotifications(savedOrder).catch((err) =>
        console.error(`Notification Error for Order ${splitId}:`, err.message),
      );

      // Affiliate Logic (ย่อไว้เหมือนเดิม)
      try {
        const itemsWithAffiliate = sellerItems.filter((i: any) => {
          const ref = i?.refAffiliateId || i?.refAffiliateID || i?.refAffiliate || i?.item?.refAffiliateId;
          return !!ref;
        });

        if (itemsWithAffiliate.length > 0) {
          const groups = new Map<string, any[]>();
          for (const it of itemsWithAffiliate) {
            const ref: string = String(it.refAffiliateId || it.item?.refAffiliateId || '');
            const key = ref.toUpperCase();
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(it);
          }

          for (const [affCodeOrId, affItems] of groups) {
            let affiliate: AffiliateDocument | null = null;
            if (Types.ObjectId.isValid(affCodeOrId)) {
              affiliate = await this.affiliateModel.findById(affCodeOrId);
            } else {
              affiliate = await this.affiliateModel.findOne({ code: String(affCodeOrId).toUpperCase() });
            }

            if (affiliate) {
              const validAffiliate = affiliate as AffiliateDocument;
              const itemsForRecord = affItems.map((i: any) => ({
                productId: i.productId,
                name: i.name,
                price: i.price,
                qty: i.qty,
              }));
              const amount = affItems.reduce((sum: number, i: any) => sum + i.price * i.qty, 0);
              let commissionAmount = 0;
              for (const it of affItems) {
                const prod = it.originalProduct;
                const qty = it.qty || 1;
                const itemPrice = it.price || 0;
                const commissionRate = (prod && prod.commission) ? Number(prod.commission) : 0;
                commissionAmount += (itemPrice * qty * commissionRate) / 100;
              }

              const affOrder = new this.affiliateOrderModel({
                order: savedOrder._id,
                affiliate: validAffiliate._id,
                amount,
                commissionAmount,
                status: 'pending',
                items: itemsForRecord,
              });
              await affOrder.save();
            }
          }
        }
      } catch (err) {
        console.error('❌ Failed to create per-item AffiliateOrder:', err);
      }

      subIndex++;
    }

    if (orderData.user) {
      try {
        const userIdString = orderData.user.toString();
        const orderedProductIds = item.map((i) =>
          Types.ObjectId.isValid(i.productId) ? new Types.ObjectId(i.productId) : i.productId,
        );
        const userObjId = Types.ObjectId.isValid(userIdString) ? new Types.ObjectId(userIdString) : null;
        const queryConditions: any[] = [{ userId: userIdString }, { user: userIdString }];
        if (userObjId) { queryConditions.push({ userId: userObjId }); queryConditions.push({ user: userObjId }); }
        const cartExists = await this.cartModel.findOne({ $or: queryConditions });
        if (cartExists) {
          await this.cartModel.updateOne({ _id: cartExists._id }, { $pull: { items: { productId: { $in: orderedProductIds } } } }).exec();
        }
      } catch (error) { console.error('Failed to clear cart:', error); }
    }
    return createdOrders;
  }

  // ... (Notification Helper เหมือนเดิม) ...
  async sendOrderNotifications(order: any) {
    try {
      if (order.user) {
        const buyerId = order.user.toString();
        await this.notificationService.createAndSend(
          buyerId, 'รอการยืนยันคำสั่งซื้อจากผู้ขาย', `คำสั่งซื้อ #${order.orderId || order._id} อยู่ระหว่างรอการตอบรับจากร้านค้า`,
          'order', { orderId: order.orderId || order._id, role: 'buyer' }, order.item?.[0]?.image || ''
        );
      }
      const sellerId = order.seller;
      if (sellerId) {
        const idString = sellerId.toString();
        const queryConditions: any[] = [{ userId: idString }, { _id: idString }];
        if (Types.ObjectId.isValid(idString)) {
          const idObj = new Types.ObjectId(idString);
          queryConditions.push({ userId: idObj }, { _id: idObj });
        }
        const shop = await this.sellerModel.findOne({ $or: queryConditions }).exec();
        if (shop && shop.userId) {
          const ownerId = shop.userId.toString();
          if (ownerId !== order.user?.toString()) {
            await this.notificationService.createAndSend(
              ownerId, 'คำสั่งซื้อใหม่ 📦', `คุณได้รับคำสั่งซื้อใหม่ #${order.orderId} ที่ร้าน ${shop.display_name || 'ของคุณ'}`,
              'order', { orderId: order.orderId || order._id, role: 'seller', shopId: shop._id.toString() }, order.item && order.item[0] ? order.item[0].image : '',
            );
          }
        }
      }
    } catch (error) { console.error('Notification Error:', error); }
  }

  // ... (FindAll / FindOne เหมือนเดิม) ...
  async findAll() {
    return this.orderModel.find().populate('user', 'firstName lastName email').populate({ path: 'item.productId', select: 'name price userId image stock', populate: { path: 'userId', select: 'name shopName username image' } }).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    let condition: any = { orderId: id };
    if (Types.ObjectId.isValid(id)) { condition = { $or: [{ _id: id }, { orderId: id }] }; }
    const order = await this.orderModel.findOne(condition).populate('user').populate({ path: 'item.productId', select: 'name price userId image stock', populate: { path: 'userId' } }).exec();
    if (!order) throw new NotFoundException(`Order with ID ${id} not found`);
    return order;
  }

  async findBestSellers(limit = 5, sellerId?: string) {
    const parsedLimit = Number(limit) > 0 ? Number(limit) : 5;
    const matchStage: any = {
      status: { $in: ['completed', 'delivered', 'Completed', 'Delivered'] },
    };

    if (sellerId) {
      const sellerObjectId = Types.ObjectId.isValid(sellerId)
        ? new Types.ObjectId(sellerId)
        : null;
      matchStage.seller = sellerObjectId
        ? { $in: [sellerObjectId, sellerId] }
        : sellerId;
    }

    const pipeline: any[] = [];

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push(
      { $unwind: '$item' },
      {
        $addFields: {
          productIdRaw: {
            $cond: [
              { $eq: [{ $type: '$item.productId' }, 'object'] },
              { $ifNull: ['$item.productId._id', '$item.productId.id'] },
              '$item.productId',
            ],
          },
        },
      },
      {
        $addFields: {
          productObjId: {
            $convert: {
              input: '$productIdRaw',
              to: 'objectId',
              onError: null,
              onNull: null,
            },
          },
        },
      },
      { $match: { productObjId: { $ne: null } } },
      { $group: { _id: '$productObjId', totalSold: { $sum: '$item.qty' } } },
      { $sort: { totalSold: -1 } },
      { $limit: parsedLimit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          totalSold: 1,
          product: 1,
        },
      },
    );

    return this.orderModel.aggregate(pipeline).exec();
  }

  // =================================================================
  // 5. UPDATE (แก้ไข: เพิ่ม Logic โอนเงินเข้า Wallet)
  // =================================================================
  async update(id: string, updateOrderDto: any) {
    if (!updateOrderDto || Object.keys(updateOrderDto).length === 0) {
      throw new BadRequestException('No data provided for update');
    }

    const { role, ...orderDataToSave } = updateOrderDto;

    let condition: any = { orderId: id };
    if (Types.ObjectId.isValid(id)) { condition = { $or: [{ _id: id }, { orderId: id }] }; }
    const oldOrder = await this.orderModel.findOne(condition).exec();

    if (!oldOrder) { throw new NotFoundException(`Order with ID ${id} not found`); }

    const isStatusChanged = orderDataToSave.status && (oldOrder.status !== orderDataToSave.status);

    // --- Logic จัดการ Stock ---
    if (isStatusChanged) {
      const newStatus = orderDataToSave.status.toLowerCase();
      const oldStatus = oldOrder.status.toLowerCase();

      // ตัดสต็อก (เมื่อส่งของ)
      const isShopShipping = (newStatus === 'shipped' || newStatus === 'shipping') && !(oldStatus === 'shipped' || oldStatus === 'shipping' || oldStatus === 'completed' || oldStatus === 'delivered');
      if (isShopShipping) {
        const deductedItems: any[] = [];
        try {
          for (const item of oldOrder.item) {
            const result = await this.productService.decreaseStock(item.productId, item.qty);
            if (!result) throw new BadRequestException(`สินค้า "${item.name}" หมดสต็อก`);
            deductedItems.push(item);
          }
        } catch (error) {
          for (const item of deductedItems) { await this.productService.increaseStock(item.productId, item.qty); }
          throw error;
        }
      }

      // คืนสต็อก (เมื่อยกเลิก)
      const isCancelling = (newStatus === 'cancelled' || newStatus === 'cancel');
      const wasStockDeducted = (oldStatus === 'shipped' || oldStatus === 'shipping' || oldStatus === 'completed' || oldStatus === 'delivered');
      if (isCancelling && wasStockDeducted) {
        for (const item of oldOrder.item) { await this.productService.increaseStock(item.productId, item.qty); }
      }

      // ✅✅✅ Logic โอนเงินเข้า Wallet ของ Seller ✅✅✅
      if (newStatus === 'completed' || newStatus === 'delivered') {
        // เช็คว่ายังไม่เคยจ่ายเงินให้ Seller
        if (!oldOrder.isSellerPaid) {
          const earnings = oldOrder.sellerEarnings || 0;
          const sellerId = oldOrder.seller;

          if (earnings > 0 && sellerId) {
            try {
              const sellerObjectId = Types.ObjectId.isValid(sellerId)
                ? new Types.ObjectId(sellerId.toString())
                : null;

              if (!sellerObjectId) {
                throw new Error(`Invalid Seller ID format: ${sellerId}`);
              }

              // 2. อัปเดต Wallet
              await this.walletModel.findOneAndUpdate(
                { userId: sellerObjectId }, // 👈 🚨 แก้ตรงนี้! เปลี่ยนจาก sellerId เป็น userId
                {
                  $inc: { balance: earnings },
                  $push: {
                    transactions: {
                      type: 'income',
                      amount: earnings,
                      description: `รายได้จากคำสั่งซื้อ #${oldOrder.orderId}`,
                      status: 'completed',
                      createdAt: new Date()
                    }
                  }
                },
                { upsert: true, new: true }
              ).exec();

              // 3. ตั้งค่า flag ว่าจ่ายแล้ว
              orderDataToSave.isSellerPaid = true;

              console.log(`💰 Transfer success: ${earnings} THB to Seller ${sellerId}`);
            } catch (err) {
              console.error('❌ Wallet transfer failed:', err);
            }
          }
        }
      }
      // ✅✅✅ จบส่วนโอนเงิน ✅✅✅

    }

    // บันทึกการแก้ไขลง Order
    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(oldOrder._id, { $set: orderDataToSave }, { new: true, runValidators: true })
      .exec();

    if (!updatedOrder) throw new NotFoundException(`Order with ID ${id} failed to update`);

    // ส่ง Notification
    if (isStatusChanged) {
      this.handleStatusChangeNotification(updatedOrder, orderDataToSave.status, oldOrder.status, role);

      // อัปเดตสถานะ Affiliate Order
      const newStatus = orderDataToSave.status.toLowerCase();
      if (newStatus === 'completed' || newStatus === 'delivered') {

        // 1. หาข้อมูล Affiliate Order ที่ผูกกับออเดอร์นี้ และสถานะยังเป็น 'pending' (กันการจ่ายเงินเบิ้ล)
        const pendingAffOrders = await this.affiliateOrderModel.find({
          order: updatedOrder._id,
          status: 'pending'
        }).populate('affiliate').exec();

        // 2. วนลูปเพื่อจ่ายเงิน (เผื่อ 1 ออเดอร์มีสินค้าจากหลาย Affiliate)
        for (const affOrder of pendingAffOrders) {
          const commission = affOrder.commissionAmount;
          const affiliateData = affOrder.affiliate as any; // ข้อมูลนายหน้าที่ดึงมาจาก populate

          // ถ้ามีค่าคอมมิชชั่น และมี user ชัดเจน
          if (commission > 0 && affiliateData && affiliateData.user) {
            const affiliateUserId = affiliateData.user;

            try {
              // โอนเงินเข้า Wallet ของ Affiliate (ใช้ userId เพื่อให้ใช้กระเป๋าร่วมกับ Seller ได้)
              await this.walletModel.findOneAndUpdate(
                { userId: new Types.ObjectId(affiliateUserId.toString()) },
                {
                  $inc: { balance: commission }, // บวกค่าคอมมิชชั่น
                  $push: {
                    transactions: {
                      type: 'income', // คุณสามารถเปลี่ยนเป็น 'affiliate_income' ได้ถ้าอยากให้แยกชัดเจน
                      amount: commission,
                      description: `ค่าคอมมิชชั่นจากคำสั่งซื้อ #${oldOrder.orderId}`,
                      status: 'completed',
                      createdAt: new Date()
                    }
                  }
                },
                { upsert: true, new: true } // ถ้ายังไม่มีกระเป๋าให้สร้างใหม่เลย
              ).exec();

              // อัปเดตสถานะบิลของ Affiliate ว่า "จ่ายแล้ว"
              affOrder.status = 'paid';
              await affOrder.save();

              console.log(`💰 Affiliate Transfer success: ${commission} THB to User ${affiliateUserId}`);
            } catch (err) {
              console.error('❌ Affiliate Wallet transfer failed:', err);
            }
          }
        }
      }

      // ถ้าออเดอร์ถูกยกเลิก ให้เปลี่ยนสถานะ Affiliate เป็น cancelled ด้วย
      if (newStatus === 'cancelled') {
        await this.affiliateOrderModel.updateMany({ order: updatedOrder._id }, { $set: { status: 'cancelled' } });
      }
    }
    return updatedOrder;
  }

  // ... (Notification Status Logic เหมือนเดิม) ...
  async handleStatusChangeNotification(order: any, status: string, previousStatus: string = '', role: string = '') {
    try {
      const statusLower = status.toLowerCase();
      const prevStatusLower = (previousStatus || '').toLowerCase();
      let titleBuyer = ''; let msgBuyer = ''; let titleSeller = ''; let msgSeller = '';

      if ((prevStatusLower.includes('request') || prevStatusLower.includes('return') || prevStatusLower.includes('cancel')) && (statusLower === 'preparing' || statusLower === 'processing')) {
        titleBuyer = 'ร้านค้าปฏิเสธคำร้องขอ ❌';
        msgBuyer = `ร้านค้าได้ปฏิเสธคำขอยกเลิก/คืนสินค้า และจะดำเนินการจัดเตรียมสินค้าต่อ` + (order.note ? `\nเหตุผล: ${order.note}` : '');
      } else if (statusLower === 'cancel requested' || statusLower === 'cancellation requested' || statusLower === 'return_requested' || statusLower === 'return requested') {
        titleBuyer = 'ส่งคำขอตรวจสอบแล้ว';
        msgBuyer = `คำร้องขอสำหรับออเดอร์ #${order.orderId} ถูกส่งไปยังร้านค้าแล้ว กรุณารอการอนุมัติ`;
        titleSeller = '⚠️ มีคำขอยกเลิก/คืนสินค้า';
        msgSeller = `ออเดอร์ #${order.orderId} มีการแจ้งปัญหาหรือขอยกเลิก กรุณาตรวจสอบ`;
      } else if (statusLower === 'cancelled' || statusLower === 'cancel') {
        titleBuyer = 'คำสั่งซื้อถูกยกเลิก';
        if (role === 'seller' || role === 'admin') {
          msgBuyer = `ร้านค้าได้ยกเลิกคำสั่งซื้อ #${order.orderId}` + (order.note ? `\nเหตุผล: ${order.note}` : '');
          titleSeller = 'ยกเลิกคำสั่งซื้อสำเร็จ';
          msgSeller = `คุณได้ยกเลิกคำสั่งซื้อ #${order.orderId} เรียบร้อยแล้ว`;
        } else {
          msgBuyer = `คำสั่งซื้อ #${order.orderId} ถูกยกเลิกเรียบร้อยแล้ว`;
          titleSeller = '🚫 คำสั่งซื้อถูกยกเลิก';
          msgSeller = `คำสั่งซื้อ #${order.orderId} ถูกยกเลิกโดยผู้ซื้อ/ระบบ`;
        }
      } else if (['accepted', 'processing', 'preparing', 'prepared', 'confirmed'].includes(statusLower)) {
        titleBuyer = 'ร้านค้ารับคำสั่งซื้อแล้ว ✅'; msgBuyer = `ร้านค้าได้รับออเดอร์ #${order.orderId} แล้วและกำลังเตรียมสินค้า`;
      } else if (statusLower === 'shipped' || statusLower === 'shipping') {
        titleBuyer = 'สินค้าถูกจัดส่งแล้ว 🚚'; msgBuyer = `ออเดอร์ #${order.orderId} อยู่ระหว่างการจัดส่ง`;
      } else if (statusLower === 'completed' || statusLower === 'delivered') {
        titleBuyer = 'คำสั่งซื้อเสร็จสมบูรณ์'; msgBuyer = `ขอบคุณที่สั่งซื้อสินค้า ออเดอร์ #${order.orderId} สำเร็จเรียบร้อย`;
        titleSeller = 'ออเดอร์สำเร็จ 🎉'; msgSeller = `ออเดอร์ #${order.orderId} ลูกค้าได้รับสินค้าและกดยอมรับแล้ว (เงินเข้าระบบเรียบร้อย)`;
      }

      const buyerId = (order.user._id || order.user).toString();
      if (titleBuyer && order.user) {
        await this.notificationService.createOrUpdate(buyerId, titleBuyer, msgBuyer, 'order', { orderId: order.orderId || order._id, role: 'buyer' }, order.item?.[0]?.image || '');
      }
      if (titleSeller && order.seller) {
        const sellerId = order.seller.toString();
        const queryConditions: any[] = [{ userId: sellerId }, { _id: sellerId }];
        if (Types.ObjectId.isValid(sellerId)) { const sId = new Types.ObjectId(sellerId); queryConditions.push({ userId: sId }, { _id: sId }); }
        const shop = await this.sellerModel.findOne({ $or: queryConditions }).exec();
        if (shop && shop.userId) {
          const ownerId = shop.userId.toString();
          if (ownerId !== buyerId) {
            await this.notificationService.createOrUpdate(ownerId, titleSeller, msgSeller, 'order', { orderId: order.orderId || order._id, role: 'seller', shopId: shop._id }, order.item?.[0]?.image || '');
          }
        }
      }
    } catch (error) { console.error('Failed to send status notification:', error); }
  }

  // ... (Remove เหมือนเดิม) ...
  async remove(id: string) {
    let condition: any = { orderId: id };
    if (Types.ObjectId.isValid(id)) { condition = { $or: [{ _id: id }, { orderId: id }] }; }
    const deletedOrder = await this.orderModel.findOneAndDelete(condition).exec();
    if (!deletedOrder) throw new NotFoundException(`Order with ID ${id} not found`);
    return { deleted: true };
  }
}