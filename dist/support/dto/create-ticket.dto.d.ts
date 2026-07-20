import { SupportTicketCategory, SupportTicketPriority } from '../../database/entities/support-ticket.entity';
export declare class CreateSupportTicketDto {
    subject: string;
    description: string;
    category: SupportTicketCategory;
    priority?: SupportTicketPriority;
    orderId?: string;
}
