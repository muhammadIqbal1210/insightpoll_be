import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async getAllCategories(params?: { page?: number; limit?: number; search?: string }) {
    const where: any = {};
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params?.page || params?.limit) {
      const page = params?.page && params.page > 0 ? Number(params.page) : 1;
      const limit = params?.limit && params.limit > 0 ? Number(params.limit) : 10;
      const skip = (page - 1) * limit;

      const [total, items] = await Promise.all([
        (this.prisma as any).category.count({ where }),
        (this.prisma as any).category.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: { posts: true },
            },
          },
        }),
      ]);

      return {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // Default jika tanpa pagination parameter (tetap backward-compatible array / atau wrapped)
    const items = await (this.prisma as any).category.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return {
      items,
      pagination: {
        total: items.length,
        page: 1,
        limit: items.length || 10,
        totalPages: 1,
      },
    };
  }

  async getCategoryById(id: string) {
    const category = await (this.prisma as any).category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Kategori tidak ditemukan');
    }

    return category;
  }

  async createCategory(dto: CreateCategoryDto) {
    const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);

    // Cek duplikasi nama atau slug
    const existing = await (this.prisma as any).category.findFirst({
      where: {
        OR: [{ name: dto.name.trim() }, { slug }],
      },
    });

    if (existing) {
      throw new ConflictException('Nama atau slug kategori sudah digunakan');
    }

    return (this.prisma as any).category.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.getCategoryById(id);

    const updateData: any = {};
    if (dto.name) {
      updateData.name = dto.name.trim();
      if (!dto.slug) {
        updateData.slug = this.slugify(dto.name);
      }
    }

    if (dto.slug) {
      updateData.slug = this.slugify(dto.slug);
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description?.trim() || null;
    }

    // Cek bentrok nama atau slug jika diubah
    if (updateData.name || updateData.slug) {
      const existing = await (this.prisma as any).category.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(updateData.name ? [{ name: updateData.name }] : []),
            ...(updateData.slug ? [{ slug: updateData.slug }] : []),
          ],
        },
      });

      if (existing) {
        throw new ConflictException('Nama atau slug kategori sudah digunakan oleh kategori lain');
      }
    }

    return (this.prisma as any).category.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteCategory(id: string) {
    await this.getCategoryById(id);

    await (this.prisma as any).category.delete({
      where: { id },
    });

    return { message: 'Kategori berhasil dihapus' };
  }
}
