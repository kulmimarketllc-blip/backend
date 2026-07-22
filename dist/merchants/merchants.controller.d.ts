import { ConfigService } from '@nestjs/config';
import { MerchantsService } from './merchants.service';
import { User } from '../database/entities/user.entity';
import { MerchantStatus } from '../database/entities/supporting.entities';
declare class RegisterMerchantDto {
    storeName: string;
    description?: string;
    businessInfo?: any;
}
declare class UpdateStoreDto {
    storeName?: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    businessInfo?: any;
    returnPolicyDays?: number;
}
declare class PayoutRequestDto {
    amount: number;
}
declare class ConnectBankAccountDto {
    stripeAccountId: string;
    bankName?: string;
    accountLast4?: string;
}
declare class ConnectStripeOnboardingDto {
    refreshUrl?: string;
    returnUrl?: string;
}
export declare class MerchantsController {
    private readonly merchantsService;
    private readonly config;
    constructor(merchantsService: MerchantsService, config: ConfigService);
    findBySlug(slug: string): Promise<import("../database/entities/supporting.entities").Merchant>;
    register(user: User, dto: RegisterMerchantDto): Promise<import("../database/entities/supporting.entities").Merchant>;
    getMyStore(user: User): Promise<import("../database/entities/supporting.entities").Merchant | null>;
    updateStore(user: User, dto: UpdateStoreDto, files?: {
        logo?: Express.Multer.File[];
        banner?: Express.Multer.File[];
    }): Promise<import("../database/entities/supporting.entities").Merchant>;
    toggleOnline(user: User): Promise<{
        isOnline: boolean;
    }>;
    getEarnings(user: User, period?: any): Promise<{
        period: "week" | "month" | "year";
        summary: any;
        dailyBreakdown: any;
        topProducts: any;
    }>;
    requestPayout(user: User, dto: PayoutRequestDto): Promise<{
        requested: boolean;
        transferId: string;
        amount: number;
        remainingBalance: number;
    }>;
    getPayoutHistory(user: User, limit?: number): Promise<{
        id: string;
        amount: number;
        currency: string;
        createdAt: string;
        status: string;
        destination: string | import("stripe").Stripe.Account | null;
        description: string | null;
    }[]>;
    createConnectAccount(user: User, dto?: ConnectStripeOnboardingDto): Promise<{
        accountId: string;
        onboardingUrl: string;
        expiresAt: number;
    }>;
    connectBankAccount(user: User, dto: ConnectBankAccountDto): Promise<import("../database/entities/supporting.entities").Merchant>;
    findAll(page?: number, limit?: number, status?: MerchantStatus): Promise<{
        data: import("../database/entities/supporting.entities").Merchant[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<import("../database/entities/supporting.entities").Merchant>;
    approve(id: string, body: {
        commissionRate?: number;
    }): Promise<import("../database/entities/supporting.entities").Merchant>;
    suspend(id: string, body: {
        reason?: string;
    }): Promise<import("../database/entities/supporting.entities").Merchant>;
    setCommission(id: string, body: {
        rate: number;
    }): Promise<import("../database/entities/supporting.entities").Merchant>;
}
export {};
