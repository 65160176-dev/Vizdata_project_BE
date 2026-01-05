import { 
  Controller, Get, Post, Param, UseGuards, Req, 
  UseInterceptors, UploadedFile, BadRequestException, Logger 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs'; // ✅ ใช้เช็คและสร้างโฟลเดอร์
import { SellerService } from './seller.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sellers')
@Controller('sellers')
export class SellerController {
  private readonly logger = new Logger(SellerController.name); // ✅ เพิ่ม Logger ไว้ดูใน Terminal

  constructor(private readonly sellerService: SellerService) {}

  @Get()
  async findAll() { return { success: true, data: await this.sellerService.findAll() }; }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  async getMyProfile(@Req() req: any) { 
    return { success: true, data: await this.sellerService.findByUserId(req.user.userId) }; 
  }

  // --- 🔥 API Upload (ฉบับแก้ปัญหาไฟล์ไม่เข้า) ---
  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard) 
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      // ✅ 1. ใช้ process.cwd() เพื่อชี้ไปที่ Root โปรเจกต์แน่นอน (แก้ปัญหาหาโฟลเดอร์ไม่เจอใน dist)
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads', 'avatars');
        
        // ✅ 2. ถ้าไม่มีโฟลเดอร์ ให้สร้างเดี๋ยวนี้เลย!
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
          console.log(`📂 Created directory: ${uploadPath}`);
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
       if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
           return cb(new BadRequestException('Only image files are allowed!'), false);
       }
       cb(null, true);
    }
  }))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    // ✅ 3. ถ้า Frontend ส่งมาถูก บรรทัดนี้ต้องขึ้นใน Terminal Backend
    this.logger.log(`📥 File receiving attempt...`);

    if (!file) {
      this.logger.error(`❌ Upload failed: No file received`);
      throw new BadRequestException('File is required (Key must be "file")');
    }

    this.logger.log(`✅ File saved at: ${file.path}`);

    // Path ที่จะเก็บใน DB
    const imagePath = `/uploads/avatars/${file.filename}`;
    const updatedSeller = await this.sellerService.updateAvatar(req.user.userId, imagePath);

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: updatedSeller.avatar,
        fullUrl: `${req.protocol}://${req.get('host')}${imagePath}`
      }
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) { return { success: true, data: await this.sellerService.findById(id) }; }
}