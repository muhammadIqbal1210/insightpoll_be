import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  verifySecretKey(secretKey: string): void {
    const configuredSecret = process.env.LOGIN_SECRET_KEY;
    if (!configuredSecret || secretKey !== configuredSecret) {
      // Sesuai requirement: Jika secret key salah atau tidak cocok, return NotFoundException (404)
      throw new NotFoundException('Cannot POST /login/' + secretKey);
    }
  }

  async login(secretKey: string, loginDto: LoginDto) {
    this.verifySecretKey(secretKey);

    const { email, password } = loginDto;

    // Cari user di database
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    // Verifikasi password hash menggunakan bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    };
  }
}
