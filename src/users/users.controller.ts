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
import { UsersService } from './users.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto.js';
import { UpdateProfileDto } from './dto/profile.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Mengambil data profil user yang sedang login (Admin atau Editor)
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req: any) {
    const data = await this.usersService.getProfile(req.user.id);
    return {
      message: 'Berhasil mengambil profil pengguna',
      data,
    };
  }

  /**
   * Memperbarui profil dan/atau ganti password user sendiri
   */
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    const data = await this.usersService.updateProfile(req.user.id, dto);
    return {
      message: 'Profil berhasil diperbarui',
      data,
    };
  }

  /**
   * Mengambil semua daftar user (Hanya ADMIN yang diizinkan)
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Admin yang dapat mengakses manajemen user');
    }
    const result = await this.usersService.getAllUsers({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
    return {
      message: 'Berhasil mengambil daftar pengguna',
      data: result.items,
      pagination: result.pagination,
    };
  }

  /**
   * Menambahkan user baru (misal role EDITOR atau ADMIN)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async createUser(@Request() req: any, @Body() dto: CreateUserDto) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Admin yang dapat menambahkan pengguna baru');
    }
    const data = await this.usersService.createUser(dto);
    return {
      message: 'Pengguna berhasil ditambahkan',
      data,
    };
  }

  /**
   * Mengupdate data user
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updateUser(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Admin yang dapat mengubah data pengguna');
    }
    const data = await this.usersService.updateUser(id, dto);
    return {
      message: 'Data pengguna berhasil diperbarui',
      data,
    };
  }

  /**
   * Menghapus user
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Request() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Admin yang dapat menghapus pengguna');
    }
    return this.usersService.deleteUser(id, req.user.id);
  }
}
