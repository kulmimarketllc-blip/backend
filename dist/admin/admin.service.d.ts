import { Repository, DataSource } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { Product, ProductStatus } from '../database/entities/product.entity';
import { Merchant, MerchantStatus } from '../database/entities/supporting.entities';
import { OrderItem } from '../database/entities/order.entity';
import { PlatformSetting } from '../database/entities/platform-setting.entity';
export declare class AdminService {
    private readonly usersRepo;
    private readonly ordersRepo;
    private readonly productsRepo;
    private readonly merchantsRepo;
    private readonly orderItemsRepo;
    private readonly settingsRepo;
    private readonly dataSource;
    private readonly logger;
    constructor(usersRepo: Repository<User>, ordersRepo: Repository<Order>, productsRepo: Repository<Product>, merchantsRepo: Repository<Merchant>, orderItemsRepo: Repository<OrderItem>, settingsRepo: Repository<PlatformSetting>, dataSource: DataSource);
    getDashboardStats(): Promise<{
        users: {
            total: number;
            customers: number;
            merchants: number;
            drivers: number;
            new_this_month: number;
        };
        orders: {
            total: number;
            confirmed: number;
            in_transit: number;
            delivered: number;
            cancelled: number;
            today: number;
        };
        revenue: any;
        categoryBreakdown: any[];
        recentOrders: Order[];
        charts: {
            signupsTrend: {
                date: string;
                count: number;
            }[];
            revenueTrend: {
                date: string;
                revenue: number;
            }[];
        };
    }>;
    getOrderStatusCounts(): Promise<Record<string, number>>;
    getOrders(page?: number, limit?: number, status?: OrderStatus, search?: string): Promise<{
        data: Order[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getRevenueReport(period?: 'week' | 'month' | 'quarter' | 'year'): Promise<{
        period: "year" | "week" | "month" | "quarter";
        totals: any;
        byMerchant: any[];
        byCategory: any[];
        refunds: any;
    }>;
    getPendingProducts(page?: number, limit?: number): Promise<{
        data: Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    getProducts(page?: number, limit?: number, status?: ProductStatus, search?: string): Promise<{
        data: Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    approveProduct(productId: string): Promise<Product>;
    rejectProduct(productId: string): Promise<Product>;
    removeProduct(productId: string): Promise<{
        message: string;
    }>;
    getMerchants(page?: number, limit?: number, status?: MerchantStatus, search?: string): Promise<{
        data: {
            id: any;
            storeName: any;
            ownerName: any;
            ownerEmail: any;
            status: any;
            isVerified: any;
            commissionRate: number;
            avgRating: number;
            productsCount: number;
            ordersCount: number;
            revenue: number;
            commission: number;
            createdAt: any;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getCustomers(page?: number, limit?: number, status?: 'active' | 'inactive', search?: string): Promise<{
        data: {
            id: string;
            fullName: string;
            email: string;
            phone: string | null;
            isActive: boolean;
            isVerified: boolean;
            joinedAt: Date;
            ordersCount: number;
            totalSpent: number;
            lastOrderAt: any;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getDeliveryPartners(page?: number, limit?: number, status?: 'online' | 'busy' | 'offline', search?: string): Promise<{
        data: {
            id: string;
            fullName: string;
            email: string;
            phone: string | null;
            isActive: boolean;
            status: string;
            totalDeliveries: number;
            activeDeliveries: number;
            completedDeliveries: number;
            cancelledDeliveries: number;
            successRate: number;
            earnings: number;
            lastLoginAt: Date | undefined;
            joinedAt: Date;
        }[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getSettings(): Promise<{
        general: {
            platformName: string;
            supportEmail: string;
            defaultCurrency: string;
            timezone: string;
        };
        commission: {
            defaultRate: number;
            electronicsRate: number;
            fashionRate: number;
            foodGroceryRate: number;
            payoutCycle: string;
        };
        notifications: {
            newOrderAlerts: boolean;
            merchantApprovals: boolean;
            lowStockAlerts: boolean;
            revenueReports: boolean;
        };
        security: {
            twoFactorRequired: boolean;
            apiRateLimiting: boolean;
            auditLog: boolean;
        };
    } | {
        general: any;
        commission: any;
        notifications: any;
        security: any;
        updatedAt: Date;
        updatedBy: string | undefined;
    }>;
    updateSettings(payload: Record<string, any>, userId: string): Promise<{
        updatedAt: Date;
        updatedBy: string | undefined;
        general: any;
        commission: any;
        notifications: any;
        security: any;
    }>;
    private getDefaultSettings;
    private ensureSettingsTable;
    getPlatformHealth(): Promise<{
        alerts: {
            stuckOrders: number;
            lowStockProducts: number;
            pendingMerchants: number;
        };
        healthy: boolean;
    }>;
}
