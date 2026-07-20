import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { Product } from '../database/entities/product.entity';
import { User } from '../database/entities/user.entity';
export declare class PaymentsService {
    private readonly config;
    private readonly ordersRepo;
    private readonly productsRepo;
    private readonly stripe;
    private readonly logger;
    constructor(config: ConfigService, ordersRepo: Repository<Order>, productsRepo: Repository<Product>);
    createPaymentIntent(amount: number, currency?: string, metadata?: Record<string, string>): Promise<{
        clientSecret: string | null;
        intentId: string;
    }>;
    handleWebhook(payload: Buffer, signature: string): Promise<{
        received: boolean;
    }>;
    createPayout(merchantStripeAccountId: string, amountDollars: number): Promise<{
        transferId: string;
        amount: number;
    }>;
    getPlatformAvailableBalance(currency?: string): Promise<number>;
    listPayoutTransfers(merchantStripeAccountId: string, limit?: number): Promise<{
        id: string;
        amount: number;
        currency: string;
        createdAt: string;
        status: string;
        destination: string | Stripe.Account | null;
        description: string | null;
    }[]>;
    createConnectAccount(email: string): Promise<{
        accountId: string;
    }>;
    createConnectOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<{
        url: string;
        expiresAt: number;
    }>;
    createRefund(paymentIntentId: string, amountCents?: number): Promise<{
        refundId: string;
        status: string | null;
    }>;
    confirmOrderPayment(paymentIntentId: string, user: User, orderId?: string): Promise<{
        orderId: string;
        status: OrderStatus;
        paymentStatus: "succeeded";
    }>;
    private onPaymentSucceeded;
    private onPaymentFailed;
}
