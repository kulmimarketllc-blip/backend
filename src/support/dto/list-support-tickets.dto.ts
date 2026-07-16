import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTicketCategory,
} from '../../database/entities/support-ticket.entity';

export class ListSupportTicketsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsEnum(SupportTicketCategory)
  category?: SupportTicketCategory;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
