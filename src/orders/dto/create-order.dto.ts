import { IsString, IsArray, IsOptional, IsEnum, ValidateNested, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingMethod } from '../../database/entities/order.entity';

export class OrderItemDto {
  @ApiProperty() @IsString() productId: string;
  @ApiProperty() @IsNumber() @Min(1) quantity: number;
  @ApiPropertyOptional() @IsOptional() @IsString() variantId?: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items: OrderItemDto[];
  @ApiProperty() @IsString() addressId: string;
  @ApiProperty() @IsString() paymentIntentId: string;
  @ApiPropertyOptional({ enum: ShippingMethod })
  @IsOptional() @IsEnum(ShippingMethod) shippingMethod?: ShippingMethod;
  @ApiPropertyOptional() @IsOptional() @IsString() couponCode?: string;
}
