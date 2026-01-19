import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProductService } from '../product/product.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private productService: ProductService, // ✅ Inject ProductService
  ) {}

  // สร้างออเดอร์แบบแยกตามร้านค้า (Split Order)
  async create(createOrderDto: CreateOrderDto) {
    const { item, orderId, ...orderData } = createOrderDto;
    const ordersBySeller = new Map<string, any[]>();

    for (const orderItem of item) {
      const product = await this.productService.findOne(orderItem.productId);
      if (!product) throw new NotFoundException(`Product not found`);

      const sellerId = product.userId.toString();
      if (!ordersBySeller.has(sellerId)) ordersBySeller.set(sellerId, []);

      ordersBySeller.get(sellerId)!.push({
        ...orderItem,
        originalProduct: product,
      });
    }

    const createdOrders: any[] = [];
    let subIndex = 1;

    for (const [sellerId, sellerItems] of ordersBySeller) {
      const subTotal = sellerItems.reduce((sum, i) => sum + i.price * i.qty, 0);
      const subShipping = sellerItems.reduce((sum, i) => sum + (i.originalProduct.shippingCost || 0), 0);
      const splitId = ordersBySeller.size > 1 ? `${orderId}-${subIndex}` : orderId;

      const newOrder = new this.orderModel({
        ...orderData,
        orderId: splitId,
        item: sellerItems.map(i => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          image: i.image
        })),
        total: subTotal,
        shippingCost: subShipping,
      });

      createdOrders.push(await newOrder.save());
      subIndex++;
    }
    return createdOrders;
  }

  async findAll() {
    return this.orderModel.find()
      .populate('user', 'firstName lastName email')
      .populate({
        path: 'item.productId',
        select: 'name price userId image',
        populate: { path: 'userId', select: 'name shopName username image' }
      })
      .sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    return this.orderModel.findById(id).populate('user').populate({
        path: 'item.productId', populate: { path: 'userId' }
    }).exec();
  }

  async update(id: string, attrs: any) {
    return this.orderModel.findByIdAndUpdate(id, attrs, { new: true }).exec();
  }

  async remove(id: string) {
    return this.orderModel.findByIdAndDelete(id).exec();
  }
}