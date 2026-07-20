import { Job } from 'bull';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MerchantsService } from '../merchants/merchants.service';
interface OrderConfirmedJob {
    orderId: string;
    customerId: string;
    otp: string;
    total: number;
}
interface StatusChangedJob {
    orderId: string;
    newStatus: string;
    customerId: string;
}
export declare class OrdersProcessor {
    private readonly ordersRepo;
    private readonly usersRepo;
    private readonly notifications;
    private readonly merchantsService;
    private readonly logger;
    constructor(ordersRepo: Repository<Order>, usersRepo: Repository<User>, notifications: NotificationsService, merchantsService: MerchantsService);
    handleOrderConfirmed(job: Job<OrderConfirmedJob>): Promise<void>;
    handleStatusChanged(job: Job<StatusChangedJob>): Promise<void>;
    handleFailed(job: Job, err: Error): void;
}
export {};
