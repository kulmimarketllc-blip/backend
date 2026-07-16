import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class ApproveMerchantDto {
  @ApiProperty({
    description: 'Commission rate percentage for this merchant (0.5-50%; default is 8%)',
    example: 5,
    minimum: 0.5,
    maximum: 50,
  })
  @IsNumber()
  @Min(0.5)
  @Max(50)
  commissionRate!: number;

  @ApiPropertyOptional({ description: 'Internal note about approval' })
  @IsOptional()
  note?: string;
}
