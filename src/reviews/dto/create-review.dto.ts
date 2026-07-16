import {
  IsString, IsNumber, IsOptional, IsArray,
  Min, Max, MaxLength, MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'prod_01HZ...' })
  @IsString()
  productId!: string;

  @ApiProperty({ example: 'ESQ-2026-00847' })
  @IsString()
  orderId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsNumber() @Min(1) @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Absolutely love these earbuds!' })
  @IsOptional() @IsString() @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'Great sound quality, comfortable fit, fast delivery.' })
  @IsOptional() @IsString() @MinLength(10) @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ type: [String], description: 'S3 image URLs (max 5)' })
  @IsOptional() @IsArray() @IsString({ each: true })
  images?: string[];
}
