import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Mengambil semua daftar kategori (Publik / siapapun bisa baca)
   */
  @Get()
  async getAllCategories(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.categoriesService.getAllCategories({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
    return {
      message: 'Berhasil mengambil daftar kategori',
      data: result.items,
      pagination: result.pagination,
    };
  }

  /**
   * Mengambil detail satu kategori
   */
  @Get(':id')
  async getCategoryById(@Param('id') id: string) {
    const data = await this.categoriesService.getCategoryById(id);
    return {
      message: 'Berhasil mengambil detail kategori',
      data,
    };
  }

  /**
   * Menambahkan kategori baru (Hanya ADMIN yang diizinkan)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createCategory(@Request() req: any, @Body() dto: CreateCategoryDto) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Admin yang dapat menambahkan kategori');
    }
    const data = await this.categoriesService.createCategory(dto);
    return {
      message: 'Kategori berhasil ditambahkan',
      data,
    };
  }

  /**
   * Mengupdate kategori (Hanya ADMIN yang diizinkan)
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateCategory(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Admin yang dapat mengubah kategori');
    }
    const data = await this.categoriesService.updateCategory(id, dto);
    return {
      message: 'Kategori berhasil diperbarui',
      data,
    };
  }

  /**
   * Menghapus kategori (Hanya ADMIN yang diizinkan)
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCategory(@Request() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Admin yang dapat menghapus kategori');
    }
    return this.categoriesService.deleteCategory(id);
  }
}
