import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePostDto, UpdatePostDto } from './dto/post.dto.js';

@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  private generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return `${baseSlug}-${randomSuffix}`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async getAllTags(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).tag.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
      (this.prisma as any).tag.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAllPosts(params?: {
    category?: string;
    tag?: string;
    status?: string;
    search?: string;
    authorId?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    const andConditions: any[] = [];

    if (params?.category) {
      andConditions.push({
        OR: [
          { category: params.category },
          { categoryId: params.category },
          { categoryRel: { is: { slug: params.category } } },
          { categoryRel: { is: { name: params.category } } },
        ],
      });
    }
    if (params?.tag) {
      andConditions.push({
        tags: {
          some: {
            OR: [{ slug: params.tag }, { name: params.tag }],
          },
        },
      });
    }
    if (params?.status) andConditions.push({ status: params.status });
    if (params?.authorId) andConditions.push({ authorId: params.authorId });
    if (params?.search) {
      andConditions.push({
        OR: [
          { title: { contains: params.search, mode: 'insensitive' } },
          { summary: { contains: params.search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    const isPaginated = params?.page !== undefined || params?.limit !== undefined;
    const page = params?.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params?.limit && params.limit > 0 ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    const include = {
      author: {
        select: { id: true, name: true, email: true, role: true },
      },
      tags: {
        select: { id: true, name: true, slug: true },
      },
      categoryRel: {
        select: { id: true, name: true, slug: true },
      },
    };

    if (isPaginated) {
      const [total, items] = await Promise.all([
        (this.prisma as any).post.count({ where }),
        (this.prisma as any).post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include,
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

    const items = await (this.prisma as any).post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include,
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

  async getPostById(id: string) {
    const post = await (this.prisma as any).post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
        categoryRel: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Berita/artikel tidak ditemukan');
    }

    return post;
  }

  async createPost(userId: string, dto: CreatePostDto) {
    const slug = dto.slug && dto.slug.trim() !== ''
      ? dto.slug.trim()
      : this.generateSlug(dto.title);

    // Cek slug unik
    const existing = await (this.prisma as any).post.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException('Slug artikel sudah digunakan');
    }

    // Cari atau hubungkan kategori ke tabel Category
    let categoryName = dto.category?.trim() || 'Berita';
    let resolvedCategoryId: string | null = dto.categoryId || null;

    if (resolvedCategoryId) {
      const catById = await (this.prisma as any).category.findUnique({
        where: { id: resolvedCategoryId },
      });
      if (catById) {
        categoryName = catById.name;
      }
    } else if (categoryName) {
      const catByName = await (this.prisma as any).category.findFirst({
        where: {
          OR: [
            { name: categoryName },
            { slug: this.slugify(categoryName) },
          ],
        },
      });
      if (catByName) {
        resolvedCategoryId = catByName.id;
        categoryName = catByName.name;
      }
    }

    // Persiapkan relasi tags (connectOrCreate)
    const tagConnectOrCreate = (dto.tags || [])
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .map((tagName) => {
        const tagSlug = this.slugify(tagName);
        return {
          where: { name: tagName },
          create: { name: tagName, slug: tagSlug },
        };
      });

    return (this.prisma as any).post.create({
      data: {
        title: dto.title,
        slug,
        summary: dto.summary || '',
        content: dto.content,
        category: categoryName,
        categoryId: resolvedCategoryId,
        coverImage: dto.coverImage || '',
        status: dto.status || 'PUBLISHED',
        authorId: userId,
        ...(tagConnectOrCreate.length > 0
          ? { tags: { connectOrCreate: tagConnectOrCreate } }
          : {}),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
        categoryRel: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async updatePost(id: string, dto: UpdatePostDto, user?: { id: string; role: string }) {
    const existingPost = await this.getPostById(id);

    // Jika editor, hanya boleh mengedit artikel miliknya sendiri
    if (user && user.role === 'EDITOR' && existingPost.authorId !== user.id) {
      throw new ConflictException('Anda hanya dapat mengubah artikel yang Anda buat sendiri');
    }

    const { tags, category, categoryId, ...postData } = dto;
    const updatePayload: any = { ...postData };

    // Update kategori & relasi categoryId bila disediakan
    if (categoryId !== undefined || category !== undefined) {
      let categoryName = category?.trim() || existingPost.category || 'Berita';
      let resolvedCategoryId: string | null = categoryId || null;

      if (resolvedCategoryId) {
        const catById = await (this.prisma as any).category.findUnique({
          where: { id: resolvedCategoryId },
        });
        if (catById) {
          categoryName = catById.name;
        }
      } else if (categoryName) {
        const catByName = await (this.prisma as any).category.findFirst({
          where: {
            OR: [
              { name: categoryName },
              { slug: this.slugify(categoryName) },
            ],
          },
        });
        if (catByName) {
          resolvedCategoryId = catByName.id;
          categoryName = catByName.name;
        }
      }

      updatePayload.category = categoryName;
      updatePayload.categoryId = resolvedCategoryId;
    }

    if (tags !== undefined) {
      const tagConnectOrCreate = (tags || [])
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((tagName) => {
          const tagSlug = this.slugify(tagName);
          return {
            where: { name: tagName },
            create: { name: tagName, slug: tagSlug },
          };
        });

      updatePayload.tags = {
        set: [], // reset relasi tag lama
        connectOrCreate: tagConnectOrCreate,
      };
    }

    return (this.prisma as any).post.update({
      where: { id },
      data: updatePayload,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        tags: {
          select: { id: true, name: true, slug: true },
        },
        categoryRel: {
          select: { id: true, name: true, slug: true },
        },
      },
    });
  }

  async deletePost(id: string, user?: { id: string; role: string }) {
    const existingPost = await this.getPostById(id);

    // Jika editor, hanya boleh menghapus artikel miliknya sendiri
    if (user && user.role === 'EDITOR' && existingPost.authorId !== user.id) {
      throw new ConflictException('Anda hanya dapat menghapus artikel yang Anda buat sendiri');
    }

    await (this.prisma as any).post.delete({
      where: { id },
    });

    return { message: 'Berita/artikel berhasil dihapus' };
  }

  async incrementViews(id: string) {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const [post] = await Promise.all([
      (this.prisma as any).post.update({
        where: { id },
        data: {
          views: {
            increment: 1,
          },
        },
        select: {
          id: true,
          views: true,
        },
      }),
      (this.prisma as any).postDailyView.upsert({
        where: {
          postId_date: {
            postId: id,
            date: today,
          },
        },
        create: {
          postId: id,
          date: today,
          views: 1,
        },
        update: {
          views: {
            increment: 1,
          },
        },
      }),
    ]);

    return post;
  }
}
