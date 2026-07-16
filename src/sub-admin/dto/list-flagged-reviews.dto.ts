import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';

export class ListFlaggedReviewsDto {
  @ApiPropertyOptional({ default: 1, example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by product ID or review ID' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Sort by field', example: 'flaggedAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'flaggedAt';

  @ApiPropertyOptional({ description: 'Sort order', example: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({ description: 'Minimum flag count to display' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  minFlags?: number;
}
