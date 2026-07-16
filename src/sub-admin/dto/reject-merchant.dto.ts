import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RejectMerchantDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'Incomplete business documentation',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @Length(10, 500)
  reason!: string;
}
