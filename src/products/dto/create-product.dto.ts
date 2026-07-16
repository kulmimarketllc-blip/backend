// products/dto/create-product.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  Min,
  MaxLength,
  ValidateNested,
  IsIn,
  IsUrl,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class VariantValueDto {
  @ApiProperty({ example: 'red' })
  @IsString()
  id!: string;

  @ApiProperty({ example: 'Red' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 5.99 })
  @IsOptional()
  @IsNumber()
  priceModifier?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ example: 'SKU-RED-001' })
  @IsOptional()
  @IsString()
  sku?: string;
}

class ProductVariantDto {
  @ApiProperty({ enum: ['color', 'size', 'material', 'custom'] })
  @IsString()
  @IsIn(['color', 'size', 'material', 'custom'])
  type!: 'color' | 'size' | 'material' | 'custom';

  @ApiProperty({ example: 'Color' })
  @IsString()
  @MinLength(1)
  label!: string;

  @ApiProperty({ type: [VariantValueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantValueDto)
  values!: VariantValueDto[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'Premium Wireless Headphones' })
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'High-quality wireless headphones with noise cancellation...' })
  @IsString()
  description!: string;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiPropertyOptional({ example: 129.99 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  comparePrice?: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ example: 'HPH-001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    example: 'electronics',
    description: 'Category ULID, slug, or name (e.g., "electronics", "01KRTHT63VGMF8ZG4GEQCWHYZS", "Electronics")'
  })
  @IsString()
  categoryId!: string;

  @ApiPropertyOptional({ example: 'merchant_456' })
  @IsOptional()
  @IsString()
  merchantId?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockAt?: number;

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/image1.jpg'],
    description: 'Product images URLs (optional)'
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  images?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}