import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  email: string;

  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @IsOptional()
  @IsString()
  role?: string; // ADMIN / EDITOR
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @IsOptional()
  @IsString()
  role?: string;
}
