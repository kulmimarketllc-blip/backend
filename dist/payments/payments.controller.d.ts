import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { User } from '../database/entities/user.entity';
export declare class PaymentsController {
    private readonly svc;
    constructor(svc: PaymentsService);
    createIntent(body: {
        amount: number;
        currency?: string;
        metadata?: Record<string, string>;
    }): Promise<{
        clientSecret: string | null;
        intentId: string;
    }>;
    webhook(req: RawBodyRequest<Request>, sig: string): Promise<{
        received: boolean;
    }>;
    confirmPayment(body: {
        paymentIntentId: string;
        orderId?: string;
    }, user: User): Promise<{
        orderId: string;
        status: import("../database/entities/order.entity").OrderStatus;
        paymentStatus: "succeeded";
    }>;
}
