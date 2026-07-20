import { SupportTicketStatus } from '../../database/entities/support-ticket.entity';
export declare class UpdateTicketStatusDto {
    status: SupportTicketStatus;
    note?: string;
}
