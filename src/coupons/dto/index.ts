import {
  IsString, IsNumber, IsOptional, IsEnum, IsBoolean,
  IsDate, Min, Max, MaxLength, Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType, CouponScope } from '../../database/entities/review-coupon.entities';

// ─── Create ──────────────────────────────────────
export class CreateCouponDto {
  @ApiProperty({ example: 'SUMMER25', description: 'Uppercase alphanumeric code' })
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,30}$/i, { message: 'Code must be 3–30 alphanumeric characters' })
  code: string;

  @ApiPropertyOptional({ example: '25% off all orders this summer' })
  @IsOptional() @IsString() @MaxLength(200)
  description?: string;

  @ApiProperty({ enum: CouponType, example: CouponType.PERCENTAGE })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiProperty({ example: 25, description: 'Percentage (0–100) or flat dollar amount' })
  @IsNumber() @Min(0)
  value: number;

  @ApiPropertyOptional({ example: 50, description: 'Max discount cap for percentage coupons' })
  @IsOptional() @IsNumber() @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 30, description: 'Minimum cart total required' })
  @IsOptional() @IsNumber() @Min(0)
  minOrderValue?: number;

  @ApiProperty({ enum: CouponScope, default: CouponScope.ALL })
  @IsEnum(CouponScope)
  scope: CouponScope;

  @ApiPropertyOptional({ description: 'Category / Merchant / Product ID for scoped coupons' })
  @IsOptional() @IsString()
  scopeId?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional() @IsNumber() @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ example: 1, description: 'Max times one user can use this coupon' })
  @IsOptional() @IsNumber() @Min(1)
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ description: 'When the coupon becomes active' })
  @IsOptional() @Type(() => Date) @IsDate()
  startsAt?: Date;

  @ApiPropertyOptional({ description: 'When the coupon expires' })
  @IsOptional() @Type(() => Date) @IsDate()
  expiresAt?: Date;
}

// ─── Update ──────────────────────────────────────
export class UpdateCouponDto {
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ enum: CouponType }) @IsOptional() @IsEnum(CouponType) type?: CouponType;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) value?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) maxDiscount?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minOrderValue?: number;
  @ApiPropertyOptional({ enum: CouponScope }) @IsOptional() @IsEnum(CouponScope) scope?: CouponScope;
  @ApiPropertyOptional() @IsOptional() @IsString() scopeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) maxUses?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) maxUsesPerUser?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() startsAt?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() expiresAt?: Date;
}

// ─── Validate ────────────────────────────────────
export class ValidateCouponDto {
  @ApiProperty({ example: 'SUMMER25' })
  @IsString()
  code: string;

  @ApiProperty({ example: 129.99, description: 'Current cart total before discount' })
  @IsNumber() @Min(0)
  cartTotal: number;
}
