import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
export declare class DeliveryService {
    private readonly ordersRepo;
    constructor(ordersRepo: Repository<Order>);
    getActiveDelivery(driverId: string): Promise<Order | null>;
    confirmDeliveryOtp(orderId: string, otp: string, driverId: string): Promise<{
        success: boolean;
        orderId: string;
    }>;
}
