import { SupportTicketPriority, SupportTicketStatus, SupportTicketCategory } from '../../database/entities/support-ticket.entity';
export declare class ListSupportTicketsDto {
    page?: number;
    limit?: number;
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    category?: SupportTicketCategory;
    search?: string;
    assignedToId?: string;
}
