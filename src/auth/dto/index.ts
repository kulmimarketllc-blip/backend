// ─── DTOs ────────────────────────────────────────────────────────────────────
// dto/register.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../database/entities/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'Ahmed' })
  @IsString() @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Mohamed' })
  @IsString() @MaxLength(80)
  lastName!: string;

  @ApiProperty({ example: 'ahmed@email.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+16125550198' })
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Phone must be in E.164 format' })
  phone?: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString() @MinLength(8) @MaxLength(72)
  password!: string;

  @IsOptional() @IsEnum(UserRole, { message: 'role must be one of: customer, merchant, delivery_partner' })
  role?: UserRole;
}

export class RegisterMerchantUserDto extends RegisterDto {
  @ApiProperty({ example: 'Aisha Electronics' })
  @IsString() @MaxLength(100)
  storeName: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(1000)
  storeDescription?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(50)
  returnPolicy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  businessInfo?: any;
}

// dto/login.dto.ts
export class LoginDto {
  @ApiProperty({ example: 'ahmed@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString() @MinLength(1)
  password!: string;
}

// dto/verify-otp.dto.ts
export class VerifyOtpDto {
  @ApiProperty({ example: 'usr_01HZ4K...' })
  @IsString()
  userId!: string;

  @ApiProperty({ example: '842791' })
  @IsString() @MinLength(6) @MaxLength(6)
  otp!: string;
}

// dto/refresh-token.dto.ts
export class RefreshTokenDto {
  @ApiPropertyOptional({ description: 'Refresh token (or read from httpOnly cookie)' })
  @IsOptional() @IsString()
  refreshToken?: string;
}

// dto/forgot-password.dto.ts
export class ForgotPasswordDto {
  @ApiProperty({ example: 'ahmed@email.com' })
  @IsEmail()
  email!: string;
}

// dto/reset-password.dto.ts
export class ResetPasswordDto {
  @ApiProperty({ example: 'ahmed@email.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '842791' })
  @IsString() @MinLength(6) @MaxLength(6)
  otp!: string;

  @ApiProperty({ example: 'NewSecurePass123!', minLength: 8 })
  @IsString() @MinLength(8) @MaxLength(72)
  newPassword!: string;
}
