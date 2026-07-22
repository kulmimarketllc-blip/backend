import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Merchant, MerchantStatus } from '../database/entities/supporting.entities';
import { OrderItem } from '../database/entities/order.entity';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class MerchantsService {
    private readonly repo;
    private readonly itemsRepo;
    private readonly dataSource;
    private readonly paymentsService;
    private readonly notifications;
    private readonly config;
    private readonly logger;
    constructor(repo: Repository<Merchant>, itemsRepo: Repository<OrderItem>, dataSource: DataSource, paymentsService: PaymentsService, notifications: NotificationsService, config: ConfigService);
    register(userId: string, dto: {
        storeName: string;
        description?: string;
        businessInfo?: any;
    }): Promise<Merchant>;
    findByUserId(userId: string): Promise<Merchant | null>;
    findById(id: string): Promise<Merchant>;
    findBySlug(slug: string): Promise<Merchant>;
    updateStore(merchantId: string, userId: string, dto: {
        storeName?: string;
        description?: string;
        logoUrl?: string;
        bannerUrl?: string;
        businessInfo?: any;
        returnPolicyDays?: number;
        isOnline?: boolean;
        storeSlug?: string;
    }): Promise<Merchant>;
    toggleOnline(merchantId: string, userId: string): Promise<{
        isOnline: boolean;
    }>;
    getEarnings(merchantId: string, period?: 'week' | 'month' | 'year'): Promise<{
        period: "week" | "month" | "year";
        summary: any;
        dailyBreakdown: any;
        topProducts: any;
    }>;
    requestPayout(merchantId: string, userId: string, amount: number): Promise<{
        requested: boolean;
        transferId: string;
        amount: number;
        remainingBalance: number;
    }>;
    getPayoutHistory(merchantId: string, userId: string, limit?: number): Promise<{
        id: string;
        amount: number;
        currency: string;
        createdAt: string;
        status: string;
        destination: string | import("stripe").Stripe.Account | null;
        description: string | null;
    }[]>;
    createConnectAccount(merchantId: string, userId: string, email: string, links?: {
        refreshUrl?: string;
        returnUrl?: string;
    }): Promise<{
        accountId: string;
        onboardingUrl: string;
        expiresAt: number;
    }>;
    connectBankAccount(merchantId: string, userId: string, dto: {
        stripeAccountId: string;
        bankName?: string;
        accountLast4?: string;
    }): Promise<Merchant>;
    creditEarnings(merchantId: string, amount: number): Promise<void>;
    debitEarnings(merchantId: string, amount: number): Promise<void>;
    findAll(page?: number, limit?: number, status?: MerchantStatus): Promise<{
        data: Merchant[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    approve(id: string, commissionRate?: number): Promise<Merchant>;
    suspend(id: string, reason?: string): Promise<Merchant>;
    setCommissionRate(id: string, rate: number): Promise<Merchant>;
    private generateSlug;
}
