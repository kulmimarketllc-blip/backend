import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { ProductStatus } from '../../database/entities/product.entity';

export class UpdateProductDto extends PartialType(CreateProductDto) {
	@ApiPropertyOptional({ enum: ProductStatus })
	@IsOptional()
	@IsEnum(ProductStatus)
	status?: ProductStatus;
	slug?: String
}