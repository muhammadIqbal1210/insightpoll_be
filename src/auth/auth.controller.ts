import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('login')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint base_url/login (tanpa secret key)
   * Mengembalikan HTTP 404 Not Found sesuai requirement user.
   */
  @Post()
  @HttpCode(HttpStatus.NOT_FOUND)
  loginWithoutSecret() {
    throw new NotFoundException('Cannot POST /login');
  }

  /**
   * Endpoint base_url/login/verify/:secret_key
   * Digunakan oleh Frontend (Server-Side) untuk memverifikasi validitas URL sebelum merender form.
   * Hanya 1 kunci yang disimpan di Backend .env
   */
  @Get('verify/:secret_key')
  @HttpCode(HttpStatus.OK)
  verifySecretKey(@Param('secret_key') secretKey: string) {
    this.authService.verifySecretKey(secretKey);
    return { valid: true };
  }

  /**
   * Fallback jika GET /login/verify tanpa secret_key
   */
  @Get('verify')
  @HttpCode(HttpStatus.NOT_FOUND)
  verifyWithoutSecret() {
    throw new NotFoundException('Cannot GET /login/verify');
  }

  /**
   * Endpoint base_url/login/:secret_key
   * Melakukan validasi secret_key dari env dan proses login.
   */
  @Post(':secret_key')
  @HttpCode(HttpStatus.OK)
  async loginWithSecret(
    @Param('secret_key') secretKey: string,
    @Body() loginDto: LoginDto,
  ) {
    return this.authService.login(secretKey, loginDto);
  }
}
