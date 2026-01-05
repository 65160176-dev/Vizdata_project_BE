import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Seller, SellerDocument } from '../database/schemas/seller.schema';

@Injectable()
export class SellerService {
  constructor(@InjectModel(Seller.name) private sellerModel: Model<SellerDocument>) {}

  async create(userId: Types.ObjectId, username: string): Promise<Seller> {
    if (await this.sellerModel.findOne({ userId })) throw new ConflictException('Exists');
    if (await this.sellerModel.findOne({ name: username.toLowerCase() })) throw new ConflictException('Name taken');
    return new this.sellerModel({ userId, name: username.toLowerCase(), display_name: username, isActive: true }).save();
  }

  async findByUserId(userId: string | Types.ObjectId): Promise<Seller | null> {
    return this.sellerModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async findById(id: string): Promise<Seller | null> { return this.sellerModel.findById(id); }
  async findAll(): Promise<Seller[]> { return this.sellerModel.find({ isActive: true }); }
  async update(id: string, updateData: Partial<Seller>): Promise<Seller | null> { return this.sellerModel.findByIdAndUpdate(id, updateData, { new: true }); }

  // ✅ ฟังก์ชันอัปเดตรูป
  async updateAvatar(userId: string, imagePath: string): Promise<Seller> {
    const seller = await this.sellerModel.findOneAndUpdate({ userId: new Types.ObjectId(userId) }, { $set: { avatar: imagePath } }, { new: true });
    if (!seller) throw new NotFoundException('Seller not found');
    return seller;
  }
}