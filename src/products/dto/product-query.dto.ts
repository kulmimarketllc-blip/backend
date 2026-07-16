import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
export class ProductQueryDto {
  @IsOptional() @Type(() => Number) @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @Min(1) @Max(100) limit?: number = 20;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() merchant?: string;
  @IsOptional() @Type(() => Number) minPrice?: number;
  @IsOptional() @Type(() => Number) maxPrice?: number;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) inStock?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) featured?: boolean;
  @IsOptional() sort?: string;
}
