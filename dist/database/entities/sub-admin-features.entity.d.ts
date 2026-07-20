import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Order } from './order.entity';
import { Merchant } from './supporting.entities';
export declare enum DisputeReason {
    ITEM_NOT_RECEIVED = "item_not_received",
    ITEM_NOT_AS_DESCRIBED = "item_not_as_described",
    DEFECTIVE = "defective",
    FRAUDULENT_ACTIVITY = "fraudulent_activity",
    MERCHANT_CANCELLATION = "merchant_cancellation",
    OTHER = "other"
}
export declare enum DisputeStatus {
    PENDING = "pending",
    UNDER_REVIEW = "under_review",
    MERCHANT_RESPONSE_REQUIRED = "merchant_response_required",
    RESOLVED = "resolved",
    CLOSED = "closed"
}
export declare class Dispute extends BaseEntity {
    orderId: string;
    customerId: string;
    merchantId: string;
    reason: DisputeReason;
    description: string;
    evidence?: string[];
    status: DisputeStatus;
    resolution?: string;
    notes: DisputeNote[];
    order: Order;
    customer: User;
    merchant: Merchant;
}
export interface DisputeNote {
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
    isResolution?: boolean;
}
export declare class AdminActivityLog extends BaseEntity {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, any>;
    ipAddress?: string;
    admin: User;
}
export declare class SubAdminPermission extends BaseEntity {
    userId: string;
    canManageUsers: boolean;
    canManageDisputes: boolean;
    canApproveMerchants: boolean;
    canModerateReviews: boolean;
    canViewDashboard: boolean;
    canEditPermissions: boolean;
    user: User;
}
export declare enum ReportStatus {
    DRAFT = "draft",
    SUBMITTED = "submitted",
    ARCHIVED = "archived"
}
export declare class SubAdminReport extends BaseEntity {
    adminId: string;
    title: string;
    description?: string;
    status: ReportStatus;
    data?: any;
    fileUrl?: string;
    admin: User;
}
