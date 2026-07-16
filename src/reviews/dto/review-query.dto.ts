import {
  IsNumber, IsOptional, IsString,
  Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ReviewQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5)
  rating?: number;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'highest', 'lowest', 'helpful'] })
  @IsOptional() @IsString()
  sort?: string = 'newest';

  @ApiPropertyOptional()
  @IsOptional()
  verified?: boolean;
}
