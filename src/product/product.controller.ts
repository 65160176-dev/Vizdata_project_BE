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
import { memoryStorage } from 'multer';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('products')
@Controller('product')
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imagePath = createProductDto.image || '';
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'vizdata_products') as any;
      imagePath = result.secure_url;
    }

    const user = req.user;
    let finalUserId;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.userId) {
      finalUserId = typeof user.userId === 'object' ? user.userId.toString() : user.userId;
    } else if (user._id) {
      finalUserId = typeof user._id === 'object' ? user._id.toString() : user._id;
    } else if (user.sub) {
      finalUserId = user.sub;
    }

    return this.productService.create({
      ...createProductDto,
      image: imagePath,
      userId: finalUserId,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const updateData: any = { ...updateProductDto };
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'vizdata_products') as any;
      updateData.image = result.secure_url;
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
