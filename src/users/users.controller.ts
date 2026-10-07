import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { UsersService } from './users.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Mengambil semua daftar user (Hanya ADMIN yang diizinkan)
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllUsers(@Request() req: any) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Hanya Admin yang dapat mengakses manajemen user');
    }
    const data = await this.usersService.getAllUsers();
    return {
      message: 'Berhasil mengambil daftar pengguna',
      data,
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
