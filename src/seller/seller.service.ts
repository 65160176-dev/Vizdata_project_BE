import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Seller, SellerDocument } from '../database/schemas/seller.schema';

@Injectable()
export class SellerService {
  constructor(
    @InjectModel(Seller.name) private sellerModel: Model<SellerDocument>,
  ) {}

  async create(userId: Types.ObjectId, username: string): Promise<Seller> {
    // Check if seller already exists for this user
    const existingSeller = await this.sellerModel.findOne({ userId });
    if (existingSeller) {
      throw new ConflictException('Seller profile already exists for this user');
    }

    // Check if seller name is already taken
    const existingName = await this.sellerModel.findOne({ name: username.toLowerCase() });
    if (existingName) {
      throw new ConflictException('Seller name already exists');
    }

    const seller = new this.sellerModel({
      userId,
      name: username.toLowerCase(),
      display_name: username,
      description: `Welcome to ${username}'s shop`,
      isActive: true,
    });

    return seller.save();
  }

  async findByUserId(userId: string | Types.ObjectId): Promise<Seller | null> {
    return this.sellerModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async findById(id: string): Promise<Seller | null> {
    return this.sellerModel.findById(id);
  }

  async findAll(): Promise<Seller[]> {
    return this.sellerModel.find({ isActive: true });
  }

  async update(id: string, updateData: Partial<Seller>): Promise<Seller | null> {
    return this.sellerModel.findByIdAndUpdate(id, updateData, { new: true });
  }
}
