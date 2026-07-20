import { BaseEntity } from './base.entity';
import { User } from './user.entity';
export declare enum NotificationType {
    ORDER = "order",
    DISPUTE = "dispute",
    SYSTEM = "system",
    PROMO = "promo",
    REVIEW = "review",
    SUPPORT = "support"
}
export declare class AppNotification extends BaseEntity {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    actionUrl?: string;
    isRead: boolean;
    user: User;
}
