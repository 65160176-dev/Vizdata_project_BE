import { 
  Controller, Get, Post, Param, UseGuards, Req, 
  UseInterceptors, UploadedFile, BadRequestException, Logger, Patch, Body 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { SellerService } from './seller.service';
import { UsersService } from '../users/users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('sellers')
@Controller('sellers')
export class SellerController {
  private readonly logger = new Logger(SellerController.name); // ✅ เพิ่ม Logger ไว้ดูใน Terminal

  constructor(
    private readonly sellerService: SellerService,
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  async findAll() { return { success: true, data: await this.sellerService.findAll() }; }

  @Get('my-profile')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  async getMyProfile(@Req() req: any) { 
    return { success: true, data: await this.sellerService.findByUserId(req.user.userId) }; 
  }

  // --- Upload Avatar (Cloudinary) ---
  @Post('upload-avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    this.logger.log(`📥 File receiving attempt...`);
    if (!file) {
      this.logger.error(`❌ Upload failed: No file received`);
      throw new BadRequestException('File is required (Key must be "file")');
    }

    // Upload to Cloudinary
    const result = await this.cloudinaryService.uploadImage(file, 'vizdata_avatars') as any;
    const imageUrl: string = result.secure_url;
    this.logger.log(`✅ Uploaded to Cloudinary: ${imageUrl}`);

    const updatedSeller = await this.sellerService.updateAvatar(req.user.userId, imageUrl);

    // Also sync to user document so auth/me returns the new avatar
    try {
      await this.usersService.updateAvatar(req.user.userId, imageUrl);
    } catch (e) {
      this.logger.error('Failed to update user avatar: ' + e.message);
    }

    return {
      success: true,
      message: 'Avatar uploaded successfully',
      data: { avatar: updatedSeller.avatar },
    };
  }

  @Get('by-user/:userId')
  @ApiOperation({ summary: 'Get seller by user ID' })
  async findByUserId(@Param('userId') userId: string) {
    const seller = await this.sellerService.findByUserId(userId);
    if (!seller) {
      return {
        success: false,
        message: 'Seller not found',
      };
    }
    return seller;
  }

  @Patch('by-user/:userId')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'Update seller profile by user ID' })
  async updateByUserId(@Param('userId') userId: string, @Body() body: any) {
    const seller = await this.sellerService.findByUserId(userId);
    if (!seller) return { success: false, message: 'Seller not found' };

    const updateData: any = {};
    if (body.display_name) updateData.display_name = body.display_name;
    if (body.name) updateData.name = body.name;

    const updated = await this.sellerService.update(String((seller as any)._id), updateData);
    return { success: true, data: updated };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) { return { success: true, data: await this.sellerService.findById(id) }; }
}