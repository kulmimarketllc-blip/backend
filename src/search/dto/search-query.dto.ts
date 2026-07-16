// ─── dto/search-query.dto.ts ──────────────────────────────────────────────────
import {
  IsOptional, IsString, IsNumber, IsBoolean, IsEnum, Min, Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiPropertyOptional({ example: 'wireless earbuds' })
  @IsOptional() @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'electronics' })
  @IsOptional() @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'merch_01HZ...' })
  @IsOptional() @IsString()
  merchant?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 4.0, description: 'Minimum average rating' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5)
  minRating?: number;

  @ApiPropertyOptional({ example: 25, description: 'Minimum discount percent (e.g. 25 => 25%+ off)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  minDiscount?: number;

  @ApiPropertyOptional({ description: 'Only show in-stock products' })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @ApiPropertyOptional({ description: 'Only show featured products' })
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    enum: ['relevance', 'popular', 'newest', 'price_asc', 'price_desc', 'rating', 'discount'],
    default: 'relevance',
  })
  @IsOptional() @IsString()
  sort?: string = 'relevance';
}
