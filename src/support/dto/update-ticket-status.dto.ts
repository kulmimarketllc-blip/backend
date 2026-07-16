import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SupportTicketStatus } from '../../database/entities/support-ticket.entity';

export class UpdateTicketStatusDto {
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
