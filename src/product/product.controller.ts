import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Put, 
  Param, 
  Delete, 
  UseGuards, 
  Req, 
  UseInterceptors, 
  UploadedFile
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@ApiTags('products')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  // =========================================================
  // 1. CREATE PRODUCT
  // =========================================================
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/products',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  create(
    @Body() createProductDto: CreateProductDto, // 👈 ข้อมูลตรงนี้เป็น Number เรียบร้อยแล้วจาก DTO
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File
  ) {
    let imagePath = 'https://placehold.co/400'; 
    if (file) {
      imagePath = `http://localhost:3001/uploads/products/${file.filename}`;
    }

    // ✅ ไม่ต้องแปลง Number() เองแล้ว DTO ทำให้
    return this.productService.create({
      ...createProductDto,
      image: imagePath,
      userId: req.user.userId
    });
  }

  // =========================================================
  // 2. UPDATE PRODUCT
  // =========================================================
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/products',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      },
    }),
  }))
  update(
    @Param('id') id: string, 
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    const updateData: any = { ...updateProductDto };

    if (file) {
       updateData.image = `http://localhost:3001/uploads/products/${file.filename}`;
    }

    // ✅ ส่งไปได้เลย DTO ของ Update ก็จะแปลงเป็น Number ให้เหมือนกัน
    return this.productService.update(id, updateData);
  }

  // =========================================================
  // OTHER METHODS (เหมือนเดิม)
  // =========================================================
  @Get()
  findAll() { return this.productService.findAll(); }

  @Get('my-products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMyProducts(@Req() req: any) { return this.productService.findByUserId(req.user.userId); }

  @Get('seller/:userId')
  findBySeller(@Param('userId') userId: string) { return this.productService.findByUserId(userId); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.productService.findOne(id); }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) { return this.productService.remove(id); }
}