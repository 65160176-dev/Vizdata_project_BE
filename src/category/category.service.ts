import { Injectable, ConflictException, OnModuleInit, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService implements OnModuleInit {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
  ) {}

  async onModuleInit() {
    // 👇👇 [วิธีรีเซ็ตข้อมูล] 👇👇
    // ถ้าต้องการล้างข้อมูลเก่าเพื่ออัปเดตหมวดหมู่ใหม่ ให้เอา // ข้างล่างนี้ออก 1 ครั้ง -> Save -> รอ Server รัน -> ใส่ // กลับคืน
    // await this.categoryModel.deleteMany({}); 

    const count = await this.categoryModel.countDocuments({ isSystem: true });
    
    // ถ้ายังไม่มีหมวดหมู่ระบบเลย ให้สร้างใหม่
    if (count === 0) {
      console.log('🌱 Seeding default categories...');
      const defaultCats = [
        'Fashion (Women)', 'Fashion (Men)', 'Fashion (Kids)', 
        'Bags & Luggage', 'Shoes', 'Watches & Glasses', 'Jewellery', 
        'Mobile & Gadgets', 'Computers & Laptops', 'Consumer Electronics',
        'Cameras & Drones', 'Gaming & Consoles', 'Home Appliances', 
        'Beauty & Personal Care', 'Health & Wellness', 
        'Home & Living', 'Furniture', 'Tools & Home Improvement',
        'Books, Stationery & Office',
        'Sports & Outdoors', 'Automotive & Motorcycles',
        'Toys & Games', 'Hobbies & Collections', 'Musical Instruments',
        'Mom & Baby', 'Pets', 'Groceries, Food & Beverages', 'Digital Goods & Vouchers' 
      ];
      
      const payload = defaultCats.map(name => ({ name, isSystem: true, userId: null, hiddenForUsers: [] }));
      await this.categoryModel.insertMany(payload);
      console.log('✅ Default categories created!');
    }
  }

  // ✅ [NEW] ดึงหมวดหมู่ระบบทั้งหมด (สำหรับหน้าแรก Public)
  async findSystem() {
    return this.categoryModel.find({ isSystem: true })
      .select('name') // เอาแค่ชื่อกับ id พอ
      .sort({ name: 1 })
      .exec();
  }

  // ✅ 1. สร้าง/เลือกหมวดหมู่ (Tick Checkbox)
  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    // เช็คกับของระบบ
    const existsInSystem = await this.categoryModel.findOne({ 
      name: createCategoryDto.name, 
      isSystem: true 
    });
    
    if (existsInSystem) {
       // ถ้ามีในระบบ แต่ user คนนี้เคย "ซ่อน" (Untick) ไว้
       if (existsInSystem.hiddenForUsers.includes(userId)) {
           // ให้ไปดึงกลับมา (Tick กลับ)
           await this.categoryModel.findByIdAndUpdate(existsInSystem._id, {
               $pull: { hiddenForUsers: userId }
           });
           return existsInSystem;
       }
       throw new ConflictException('หมวดหมู่นี้มีในระบบและถูกเลือกอยู่แล้ว');
    }

    // เช็คของตัวเอง
    const existsUser = await this.categoryModel.findOne({ 
        name: createCategoryDto.name, 
        userId: new Types.ObjectId(userId) 
    });
    if (existsUser) {
        throw new ConflictException('คุณมีหมวดหมู่นี้อยู่แล้ว');
    }

    // สร้างใหม่ (Custom Category)
    const createdCategory = new this.categoryModel({
      ...createCategoryDto,
      userId: new Types.ObjectId(userId),
      isSystem: false
    });
    return await createdCategory.save();
  }

  // ✅ 2. ดึงข้อมูล (ส่งทั้งหมด + บอกสถานะ isSelected) - สำหรับ Seller Center
  async findAll(userId: string) {
    // ดึงมาทั้ง "ของระบบทั้งหมด" และ "ของตัวเอง"
    const categories = await this.categoryModel.find({
      $or: [
        { isSystem: true }, 
        { userId: new Types.ObjectId(userId) }
      ]
    }).sort({ isSystem: -1, createdAt: -1 }).lean().exec(); 

    // วนลูปเพื่อเช็คว่า User คนนี้ "ซ่อน" (Untick) อันไหนไว้บ้าง
    return categories.map((cat: any) => {
      const isHidden = cat.hiddenForUsers?.includes(userId.toString());
      return {
        ...cat,
        id: cat._id, 
        isSelected: !isHidden 
      };
    });
  }

  // ✅ 3. ลบ/ซ่อน (Untick Checkbox)
  async remove(id: string, userId: string) {
    const category = await this.categoryModel.findById(id);
    
    if (!category) {
        throw new BadRequestException('ไม่พบหมวดหมู่');
    }

    // กรณี A: เป็นของระบบ -> ห้ามลบจริง ให้แค่ "ซ่อน" (Untick)
    if (category.isSystem) {
        return this.categoryModel.findByIdAndUpdate(id, {
            $addToSet: { hiddenForUsers: userId } 
        });
    }

    // กรณี B: เป็นของ user เอง -> ลบจริง (ถาวร)
    if (category.userId && category.userId.toString() !== userId) {
        throw new BadRequestException('คุณไม่มีสิทธิ์ลบหมวดหมู่นี้');
    }

    return this.categoryModel.findByIdAndDelete(id);
  }
}