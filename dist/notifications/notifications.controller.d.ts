import { NotificationsService } from './notifications.service';
import { User } from '../database/entities/user.entity';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getUserNotifications(user: User, page?: string, limit?: string): Promise<{
        data: import("../database/entities/notification.entity").AppNotification[];
        meta: {
            total: number;
            page: number;
            limit: number;
            unread: number;
        };
    }>;
    markAsRead(user: User, id: string): Promise<{
        success: boolean;
    }>;
    markAllAsRead(user: User): Promise<{
        success: boolean;
    }>;
}
