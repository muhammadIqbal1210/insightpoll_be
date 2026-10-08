import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto.js';
import bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllUsers(params?: { page?: number; limit?: number; search?: string }) {
    const page = params?.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params?.limit && params.limit > 0 ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
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

  async getUserById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return user;
  }

  async getProfile(userId: string) {
    return this.getUserById(userId);
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; email?: string; currentPassword?: string; newPassword?: string },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const updateData: any = {};

    // 1. Update nama jika ada
    if (dto.name) {
      updateData.name = dto.name.trim();
    }

    // 2. Update email jika diubah
    if (dto.email) {
      const normalizedEmail = dto.email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const existing = await this.prisma.user.findFirst({
          where: { email: normalizedEmail, deletedAt: null },
        });
        if (existing) {
          throw new ConflictException('Email sudah digunakan oleh akun lain');
        }
        updateData.email = normalizedEmail;
      }
    }

    // 3. Update password jika ada input password baru
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Password saat ini wajib diisi untuk mengubah password');
      }

      const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!isPasswordValid) {
        throw new BadRequestException('Password saat ini tidak sesuai');
      }

      updateData.password = await bcrypt.hash(dto.newPassword, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async createUser(dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim(), deletedAt: null },
    });

    if (existing) {
      throw new ConflictException('Email sudah terdaftar dalam sistem');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        name: dto.name.trim(),
        password: hashedPassword,
        role: 'EDITOR',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const currentUser = await this.getUserById(id);

    const updateData: any = {};

    if (dto.email) {
      const normalizedEmail = dto.email.toLowerCase().trim();
      if (normalizedEmail !== currentUser.email) {
        const existingEmail = await this.prisma.user.findFirst({
          where: { email: normalizedEmail, deletedAt: null },
        });
        if (existingEmail) {
          throw new ConflictException('Email sudah digunakan oleh pengguna lain');
        }
        updateData.email = normalizedEmail;
      }
    }

    if (dto.name) updateData.name = dto.name.trim();
    if (dto.role) updateData.role = dto.role.toUpperCase();
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  async deleteUser(id: string, currentAdminId: string) {
    if (id === currentAdminId) {
      throw new ForbiddenException('Anda tidak dapat menghapus akun Anda sendiri');
    }

    await this.getUserById(id);

    // Soft delete: update deletedAt daripada menghapus record secara permanen
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Pengguna berhasil dihapus' };
  }
}
