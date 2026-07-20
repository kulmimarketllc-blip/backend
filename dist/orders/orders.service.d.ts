import { Repository, DataSource } from 'typeorm';
import { Queue } from 'bull';
import { Order, OrderItem, OrderStatus } from '../database/entities/order.entity';
import { Product } from '../database/entities/product.entity';
import { User } from '../database/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Dispute } from '../database/entities/sub-admin-features.entity';
import { PaymentsService } from '../payments/payments.service';
import { MerchantsService } from '../merchants/merchants.service';
export declare class OrdersService {
    private readonly ordersRepo;
    private readonly itemsRepo;
    private readonly productsRepo;
    private readonly disputeRepo;
    private readonly dataSource;
    private readonly notifications;
    private readonly paymentsService;
    private readonly merchantsService;
    private readonly ordersQueue;
    private readonly logger;
    constructor(ordersRepo: Repository<Order>, itemsRepo: Repository<OrderItem>, productsRepo: Repository<Product>, disputeRepo: Repository<Dispute>, dataSource: DataSource, notifications: NotificationsService, paymentsService: PaymentsService, merchantsService: MerchantsService, ordersQueue: Queue);
    create(dto: CreateOrderDto, customerId: string): Promise<Order>;
    updateStatus(orderId: string, newStatus: OrderStatus, updatedBy: User, note?: string): Promise<{
        orderId: string;
        status: OrderStatus;
    }>;
    refundOrder(orderId: string, updatedBy: User, note?: string): Promise<{
        orderId: string;
        status: OrderStatus;
    }>;
    getTracking(orderId: string, requesterId: string): Promise<{
        orderId: string;
        status: OrderStatus;
        estimatedDelivery: Date | undefined;
        deliveredAt: Date | undefined;
        driver: {
            name: string;
            phone: string | undefined;
        } | null;
        timeline: import("../database/entities/order.entity").StatusHistoryEntry[];
    }>;
    findByCustomer(customerId: string, page?: number, limit?: number): Promise<{
        data: Order[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findByMerchant(merchantId: string, page?: number, limit?: number): Promise<{
        data: OrderItem[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    findById(id: string): Promise<Order>;
    private generateOrderId;
    private calcEstimatedDelivery;
    private applyCoupon;
    private restoreOrderStock;
    private validateStatusTransition;
}
