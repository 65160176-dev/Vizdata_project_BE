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
  UploadedFile,
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
  constructor(private readonly productService: ProductService) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/products',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imagePath = '/uploads/products/default.png';
    if (file) {
      imagePath = `/uploads/products/${file.filename}`;
    }

    // ✅ FIX: ดึง User ID แบบปลอดภัย (รองรับทั้งแบบ Object และ String)
    const user = req.user;
    let finalUserId;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.userId) {
      // ถ้ามี userId ให้เช็คว่าเป็น Object หรือไม่
      finalUserId =
        typeof user.userId === 'object' ? user.userId.toString() : user.userId;
    } else if (user._id) {
      // ถ้าไม่มี userId ให้ใช้ _id แทน (User Document ปกติจะมี _id)
      finalUserId =
        typeof user._id === 'object' ? user._id.toString() : user._id;
    } else if (user.sub) {
      // กรณีเป็น JWT Payload อาจใช้ sub
      finalUserId = user.sub;
    }

    // console.log('Debug User ID:', finalUserId); // เปิดบรรทัดนี้ถ้าอยากดู Log ที่ Backend

    return this.productService.create({
      ...createProductDto,
      image: imagePath,
      userId: finalUserId, // ส่ง String ID ที่ถูกต้องไป
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/products',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updateData: any = { ...updateProductDto };

    if (file) {
      // ✅ บันทึกแค่ Path สัมพัทธ์เช่นกัน
      updateData.image = `/uploads/products/${file.filename}`;
    }

    return this.productService.update(id, updateData);
  }

  @Get()
  async findAll() {
    const products = await this.productService.findAll();
    console.log('=== Product API Response ===');
    console.log('Total products:', products.length);
    if (products.length > 0) {
      console.log(
        'First product sample:',
        JSON.stringify(products[0], null, 2),
      );
    }
    console.log('===========================');
    return products;
  }

  @Get('my-products')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getMyProducts(@Req() req: any) {
    return this.productService.findByUserId(req.user.userId);
  }

  @Get('seller/:userId')
  findBySeller(@Param('userId') userId: string) {
    return this.productService.findByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
