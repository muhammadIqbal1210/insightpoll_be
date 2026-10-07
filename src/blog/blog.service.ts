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

  async getAllPosts(params?: { category?: string; status?: string; search?: string }) {
    const where: any = {};
    if (params?.category) where.category = params.category;
    if (params?.status) where.status = params.status;
    if (params?.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { summary: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    return (this.prisma as any).post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async getPostById(id: string) {
    const post = await (this.prisma as any).post.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, name: true, email: true, role: true },
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

    return (this.prisma as any).post.create({
      data: {
        title: dto.title,
        slug,
        summary: dto.summary || '',
        content: dto.content,
        category: dto.category || 'Berita',
        coverImage: dto.coverImage || '',
        status: dto.status || 'PUBLISHED',
        authorId: userId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async updatePost(id: string, dto: UpdatePostDto) {
    await this.getPostById(id);

    return (this.prisma as any).post.update({
      where: { id },
      data: {
        ...dto,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async deletePost(id: string) {
    await this.getPostById(id);
    await (this.prisma as any).post.delete({
      where: { id },
    });

    return { message: 'Berita/artikel berhasil dihapus' };
  }
}
