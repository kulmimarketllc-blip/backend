import {
  IsNumber, IsOptional, IsArray, IsString,
  Min, Max, MaxLength, MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(1) @Max(5)
  rating?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MinLength(10) @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true })
  images?: string[];
}
