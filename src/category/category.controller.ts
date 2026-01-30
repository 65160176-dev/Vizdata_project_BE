import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ✅ [NEW] Public Route: ดึงหมวดหมู่ระบบได้โดยไม่ต้อง Login
  @Get('public/system')
  getSystemCategories() {
    return this.categoryService.findSystem();
  }

  // 👇 Private Routes: ต้องมี Token ถึงจะเข้าได้ 👇

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  create(@Body() createCategoryDto: CreateCategoryDto, @Req() req: any) {
    return this.categoryService.create(createCategoryDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  findAll(@Req() req: any) {
    return this.categoryService.findAll(req.user.userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  remove(@Param('id') id: string, @Req() req: any) {
    return this.categoryService.remove(id, req.user.userId);
  }
}