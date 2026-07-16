import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, Length } from 'class-validator';
import { SupportTicketCategory, SupportTicketPriority } from '../../database/entities/support-ticket.entity';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'My order hasn\'t arrived yet' })
  @IsString()
  @Length(5, 180)
  subject: string;

  @ApiProperty({ example: 'I ordered a pair of headphones 5 days ago and the tracking hasn\'t updated.' })
  @IsString()
  @Length(10, 2000)
  description: string;

  @ApiProperty({ enum: SupportTicketCategory, example: SupportTicketCategory.ORDER })
  @IsEnum(SupportTicketCategory)
  category: SupportTicketCategory;

  @ApiPropertyOptional({ enum: SupportTicketPriority, example: SupportTicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @ApiPropertyOptional({ example: 'ORD-123456' })
  @IsOptional()
  @IsString()
  orderId?: string;
}
