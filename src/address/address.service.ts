import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address, AddressDocument } from './entities/address.entity';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name) private addressModel: Model<AddressDocument>,
  ) { }

  // -------------------------
  // 1. สร้างที่อยู่ใหม่
  // -------------------------
  async create(userId: string, dto: CreateAddressDto) {
    const userObjectId = new Types.ObjectId(userId);

    if (dto.isDefault) {
      await this.addressModel.updateMany(
        { userId: userObjectId },
        { isDefault: false },
      );
    }

    const count = await this.addressModel.countDocuments({
      userId: userObjectId,
    });
    const isFirst = count === 0;

    const newAddress = new this.addressModel({
      ...dto,
      userId: userObjectId,
      isDefault: dto.isDefault || isFirst,
    });

    return newAddress.save();
  }

  // -------------------------
  // 2. ดึงข้อมูลทั้งหมด
  // -------------------------
  async findAll(userId: string) {
    const userObjectId = new Types.ObjectId(userId);

    return this.addressModel
      .find({ userId: userObjectId })
      .sort({ isDefault: -1 });
  }

  async findAllSystem() {
    return this.addressModel.find().exec();
  }

  // -------------------------
  // 3. ดึงข้อมูล 1 อัน
  // -------------------------
  async findOne(id: string) {
    const address = await this.addressModel.findById(id);
    if (!address) {
      throw new NotFoundException(`Address #${id} not found`);
    }
    return address;
  }

  // -------------------------
  // 4. อัปเดตข้อมูล (เพิ่มระบบป้องกัน Default หาย)
  // -------------------------
  async update(userId: string, id: string, dto: UpdateAddressDto) {
    const userObjectId = new Types.ObjectId(userId);

    // 🛡️🛡️ ส่วนที่เพิ่ม: ป้องกันการปลด Default ออกดื้อๆ 🛡️🛡️
    // ถ้ามีการส่งค่า isDefault: false เข้ามา...
    if (dto.isDefault === false) {
      // เช็คก่อนว่า ตัวปัจจุบันมันเป็น Default (true) อยู่หรือเปล่า?
      const currentAddress = await this.addressModel.findOne({
        _id: id,
        userId: userObjectId,
      });

      // ถ้าของเดิมเป็น true อยู่แล้ว -> ห้ามแก้เป็น false!
      if (currentAddress && currentAddress.isDefault) {
        // ลบ field isDefault ออกจาก dto เพื่อไม่ให้ Mongoose ไปยุ่งกับมัน
        // ผลคือค่าใน Database จะยังคงเป็น true เหมือนเดิม
        delete dto.isDefault;
      }
    }
    // -----------------------------------------------------

    // ถ้า User ต้องการตั้งเป็น Default (isDefault: true)
    // ให้ไปเคลียร์อันอื่นให้เป็น false ก่อน
    if (dto.isDefault) {
      await this.addressModel.updateMany(
        { userId: userObjectId, _id: { $ne: id } },
        { isDefault: false },
      );
    }

    const updatedAddress = await this.addressModel.findOneAndUpdate(
      { _id: id, userId: userObjectId },
      { $set: dto },
      { new: true },
    );

    if (!updatedAddress) {
      throw new NotFoundException(
        `Address #${id} not found or you are not the owner`,
      );
    }

    return updatedAddress;
  }

  // -------------------------
  // 5. ลบข้อมูล
  // -------------------------
  async remove(userId: string, id: string) {
    const userObjectId = new Types.ObjectId(userId);

    const deletedAddress = await this.addressModel.findOneAndDelete({
      _id: id,
      userId: userObjectId,
    });

    if (!deletedAddress) {
      throw new NotFoundException(
        `Address #${id} not found or you are not the owner`,
      );
    }

    return deletedAddress;
  }
}
