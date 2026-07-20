import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AppNotification, NotificationType } from '../database/entities/notification.entity';
import { Merchant } from '../database/entities/supporting.entities';
import { NotificationsGateway } from './notifications.gateway';
import { User, UserRole } from '../database/entities/user.entity';
export declare class NotificationsService implements OnModuleInit {
    private readonly config;
    private readonly appNotificationRepo;
    private readonly merchantRepo;
    private readonly userRepo;
    private readonly gateway;
    private readonly logger;
    private emailTransporter;
    private mailgunClient;
    private mailgunDomain;
    private mailgunFromSms;
    private firebaseReady;
    constructor(config: ConfigService, appNotificationRepo: Repository<AppNotification>, merchantRepo: Repository<Merchant>, userRepo: Repository<User>, gateway: NotificationsGateway);
    onModuleInit(): Promise<void>;
    private initEmailTransporter;
    private initMailgun;
    private initFirebase;
    private sendEmail;
    sendOtpEmail(to: string, otp: string): Promise<void>;
    sendPasswordResetOtpEmail(to: string, otp: string, expiresInMinutes?: number): Promise<void>;
    sendOrderConfirmation(to: string, orderId: string, total: number, otp: string): Promise<void>;
    sendOrderStatusUpdate(to: string, orderId: string, newStatus: string): Promise<void>;
    sendOtpSms(phone: string, otp: string): Promise<void>;
    sendPush(fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
    sendNewOrderToDriver(driverFcmToken: string, orderId: string, earnings: number): Promise<void>;
    sendNewOrderToMerchant(merchantFcmToken: string, orderId: string): Promise<void>;
    sendLowStockAlert(merchantId: string, product: {
        name: string;
        stock: number;
    }): Promise<void>;
    sendOutOfStockAlert(merchantId: string, product: {
        name: string;
    }): Promise<void>;
    createNotificationForMerchant(merchantId: string, title: string, message: string, type?: NotificationType, actionUrl?: string): Promise<AppNotification>;
    createNotificationsForRoles(roles: UserRole[], title: string, message: string, type?: NotificationType, actionUrl?: string): Promise<{
        sent: number;
    }>;
    notifySubAdmins(title: string, message: string, type?: NotificationType, actionUrl?: string): Promise<{
        sent: number;
    }>;
    createNotification(userId: string, title: string, message: string, type?: NotificationType, actionUrl?: string): Promise<AppNotification>;
    getUserNotifications(userId: string, page?: number, limit?: number): Promise<{
        data: AppNotification[];
        meta: {
            total: number;
            page: number;
            limit: number;
            unread: number;
        };
    }>;
    markAsRead(id: string, userId: string): Promise<{
        success: boolean;
    }>;
    markAllAsRead(userId: string): Promise<{
        success: boolean;
    }>;
    private countUnread;
    private resolveNotificationRecipientUserId;
    private stripHtml;
    private isSmsEnabled;
    private isPushEnabled;
    private isOrderEmailEnabled;
    private otpEmailHtml;
    private passwordResetEmailHtml;
    private orderConfirmHtml;
}
