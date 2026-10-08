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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { BlogService } from './blog.service.js';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto.js';

@Controller('posts')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  /**
   * Endpoint Upload File Cover Berita / Blog
   */
  @UseGuards(JwtAuthGuard)
  @Post('upload-cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads');
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `cover-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // Maksimal 5MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
          return cb(
            new BadRequestException('Format file hanya boleh gambar (JPG, PNG, WEBP, GIF)'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File gambar tidak ditemukan');
    }
    const fileUrl = `/uploads/${file.filename}`;
    return {
      message: 'Cover berhasil diunggah',
      fileUrl,
    };
  }

  /**
   * Mengambil semua daftar tag yang ada di sistem
   */
  @Get('tags')
  async getAllTags(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.blogService.getAllTags({
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      message: 'Berhasil mengambil daftar tag',
      data: result.items,
      pagination: result.pagination,
    };
  }

  /**
   * Mengambil semua daftar berita/blog (publik / dapat diakses siapapun)
   * Jika ada query authorId, filter berdasarkan authorId
   */
  @Get()
  async getAllPosts(
    @Query('category') category?: string,
    @Query('tag') tag?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('authorId') authorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.blogService.getAllPosts({
      category,
      tag,
      status,
      search,
      authorId,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return {
      message: 'Berhasil mengambil daftar artikel',
      data: result.items,
      pagination: result.pagination,
    };
  }

  /**
   * Detail berita/blog berdasarkan ID
   */
  @Get(':id')
  async getPostById(@Param('id') id: string) {
    const data = await this.blogService.getPostById(id);
    return {
      message: 'Berhasil mengambil artikel',
      data,
    };
  }

  /**
   * Menambahkan berita/blog baru (wajib login JWT)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createPost(@Request() req: any, @Body() dto: CreatePostDto) {
    const userId = req.user.id;
    const data = await this.blogService.createPost(userId, dto);
    return {
      message: 'Berita/artikel berhasil dibuat',
      data,
    };
  }

  /**
   * Mengupdate berita/blog (wajib login JWT)
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updatePost(@Request() req: any, @Param('id') id: string, @Body() dto: UpdatePostDto) {
    const data = await this.blogService.updatePost(id, dto, req.user);
    return {
      message: 'Berita/artikel berhasil diperbarui',
      data,
    };
  }

  /**
   * Menghapus berita/blog (wajib login JWT)
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(@Request() req: any, @Param('id') id: string) {
    return this.blogService.deletePost(id, req.user);
  }

  /**
   * Mencatat view pembaca artikel (publik, tanpa perlu login)
   */
  @Post(':id/view')
  async recordView(@Param('id') id: string) {
    const data = await this.blogService.incrementViews(id);
    return {
      message: 'View berhasil dicatat',
      data,
    };
  }
}
