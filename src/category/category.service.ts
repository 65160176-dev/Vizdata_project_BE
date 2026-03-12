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
    // ⚠️ สำคัญมาก: ล้างหมวดหมู่เก่าออก -> หลัง server restart แล้วให้ใส่ // กลับคืน
    // await this.categoryModel.deleteMany({}); 

    const count = await this.categoryModel.countDocuments({ isSystem: true });
    
    // ถ้ายังไม่มีหมวดหมู่ระบบเลย ให้สร้างใหม่
    if (count === 0) {
      console.log('🌱 Seeding default categories...');
      const defaultCats = [
  'แอปเปิ้ล',
  'โทรศัพท์มือถือและอุปกรณ์เสริม',
  'โน้ตบุ๊ค',
  'คอมประกอบ/คอมพิวเตอร์ฮาร์ดแวร์',
  'SSD/ฮาร์ดดิสก์/อุปกรณ์จัดเก็บข้อมูล',
  'จอมอนิเตอร์',
  'เกม & สตรีมมิ่งและอุปกรณ์เสริม',
  'แท็บเล็ตและอุปกรณ์เสริม',
  'ลำโพง & หูฟัง',
  'อุปกรณ์เสริมไอที',
  'เครื่องใช้ไฟฟ้าภายในบ้าน',
  'สมาร์ทแกดเจ็ต',
  'อื่นๆ'
];
      
      // 👇 เปลี่ยน payload เริ่มต้นเป็น selectedByUsers: []
      const payload = defaultCats.map(name => ({ name, isSystem: true, userId: null, selectedByUsers: [] }));
      await this.categoryModel.insertMany(payload);
      console.log('✅ Default categories created!');
    }
  }

  async findSystem() {
    const cats = await this.categoryModel.find({ isSystem: true })
      .select('name')
      .sort({ name: 1 })
      .exec();
    return cats.sort((a, b) => {
      if (a.name === 'อื่นๆ') return 1;
      if (b.name === 'อื่นๆ') return -1;
      return 0;
    });
  }

  // ✅ 1. เลือกหมวดหมู่ (Tick Checkbox)
  async create(createCategoryDto: CreateCategoryDto, userId: string) {
    const existsInSystem = await this.categoryModel.findOne({ 
      name: createCategoryDto.name, 
      isSystem: true 
    });
    
    if (existsInSystem) {
       // ถ้าเป็นของระบบ ให้เพิ่มชื่อ User คนนี้เข้าไปใน list 'คนเลือก'
       return this.categoryModel.findByIdAndUpdate(existsInSystem._id, {
           $addToSet: { selectedByUsers: userId.toString() }
       }, { new: true });
    }

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
      isSystem: false,
      selectedByUsers: [userId.toString()] // สร้างเอง ก็ต้องเลือกเองไว้ด้วย
    });
    return await createdCategory.save();
  }

  // ✅ 2. ดึงข้อมูล 
  async findAll(userId: string) {
    const categories = await this.categoryModel.find({
      $or: [
        { isSystem: true }, 
        { userId: new Types.ObjectId(userId) }
      ]
    }).sort({ isSystem: -1, createdAt: -1 }).lean().exec(); 

    return categories.map((cat: any) => {
      // 👇 เช็คว่า User คนนี้ "มีชื่ออยู่ใน array ที่เลือกไว้" หรือไม่
      const isSelected = cat.selectedByUsers?.includes(userId.toString());
      return {
        ...cat,
        id: cat._id, 
        isSelected: !!isSelected 
      };
    });
  }

  // ✅ 3. ลบ/ซ่อน (Untick Checkbox)
  async remove(id: string, userId: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) throw new BadRequestException('ไม่พบหมวดหมู่');

    // กรณี A: เป็นของระบบ -> แค่เอาชื่อตัวเองออก ($pull) 
    if (category.isSystem) {
        return this.categoryModel.findByIdAndUpdate(id, {
            $pull: { selectedByUsers: userId.toString() } 
        }, { new: true });
    }

    // กรณี B: เป็นของ user เอง -> ลบจริง (ถาวร)
    if (category.userId && category.userId.toString() !== userId) {
        throw new BadRequestException('คุณไม่มีสิทธิ์ลบหมวดหมู่นี้');
    }

    return this.categoryModel.findByIdAndDelete(id);
  }
}