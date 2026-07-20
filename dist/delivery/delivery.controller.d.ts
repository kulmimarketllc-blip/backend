import { DeliveryService } from './delivery.service';
import { User } from '../database/entities/user.entity';
export declare class DeliveryController {
    private readonly svc;
    constructor(svc: DeliveryService);
    getActive(user: User): Promise<import("../database/entities/order.entity").Order | null>;
    confirmOtp(body: {
        orderId: string;
        otp: string;
    }, user: User): Promise<{
        success: boolean;
        orderId: string;
    }>;
}
