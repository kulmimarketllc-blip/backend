import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '../database/entities/user.entity';
import { OrderStatus } from '../database/entities/order.entity';
import { MerchantsService } from '../merchants/merchants.service';
export declare class OrdersController {
    private readonly ordersService;
    private readonly merchantsService;
    constructor(ordersService: OrdersService, merchantsService: MerchantsService);
    create(dto: CreateOrderDto, user: User): Promise<import("../database/entities/order.entity").Order>;
    findMine(user: User, page?: number, limit?: number): Promise<{
        data: import("../database/entities/order.entity").Order[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findMerchantOrders(user: User, page?: number, limit?: number): Promise<{
        data: import("../database/entities/order.entity").OrderItem[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    findOne(id: string, user: User): Promise<import("../database/entities/order.entity").Order>;
    track(id: string, user: User): Promise<{
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
    updateStatus(id: string, body: {
        status: OrderStatus;
        note?: string;
    }, user: User): Promise<{
        orderId: string;
        status: OrderStatus;
    }>;
}
