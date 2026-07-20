import { BaseEntity } from './base.entity';
import { User } from './user.entity';
export declare enum SupportTicketPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    URGENT = "urgent"
}
export declare enum SupportTicketStatus {
    OPEN = "open",
    IN_PROGRESS = "in_progress",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
export declare enum SupportTicketCategory {
    ORDER = "order",
    PAYMENT = "payment",
    DELIVERY = "delivery",
    ACCOUNT = "account",
    MERCHANT = "merchant",
    OTHER = "other"
}
export declare class SupportTicket extends BaseEntity {
    ticketNo: string;
    customerId: string;
    assignedToId?: string;
    orderId?: string;
    subject: string;
    description: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    status: SupportTicketStatus;
    metadata?: Record<string, any>;
    resolvedAt?: Date;
    closedAt?: Date;
    lastReplyAt?: Date;
    lastReplyById?: string;
    customer: User;
    assignedTo?: User;
    replies: SupportTicketReply[];
}
export declare class SupportTicketReply extends BaseEntity {
    ticketId: string;
    authorId: string;
    message: string;
    isInternal: boolean;
    ticket: SupportTicket;
    author: User;
}
