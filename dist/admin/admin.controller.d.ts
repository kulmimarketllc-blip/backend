import { AdminService } from './admin.service';
import { User } from '../database/entities/user.entity';
import { OrderStatus } from '../database/entities/order.entity';
import { ProductStatus } from '../database/entities/product.entity';
import { MerchantStatus } from '../database/entities/supporting.entities';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getDashboard(): Promise<{
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
        recentOrders: import("../database/entities/order.entity").Order[];
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
    getHealth(): Promise<{
        alerts: {
            stuckOrders: number;
            lowStockProducts: number;
            pendingMerchants: number;
        };
        healthy: boolean;
    }>;
    getOrders(page?: number, limit?: number, status?: OrderStatus, search?: string): Promise<{
        data: import("../database/entities/order.entity").Order[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getOrderCounts(): Promise<Record<string, number>>;
    getRevenue(period?: any): Promise<{
        period: "year" | "week" | "month" | "quarter";
        totals: any;
        byMerchant: any[];
        byCategory: any[];
        refunds: any;
    }>;
    getPendingProducts(page?: number, limit?: number): Promise<{
        data: import("../database/entities/product.entity").Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
        };
    }>;
    getProducts(page?: number, limit?: number, status?: ProductStatus, search?: string): Promise<{
        data: import("../database/entities/product.entity").Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    approveProduct(id: string): Promise<import("../database/entities/product.entity").Product>;
    rejectProduct(id: string): Promise<import("../database/entities/product.entity").Product>;
    removeProduct(id: string): Promise<{
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
    updateSettings(payload: Record<string, any>, user: User): Promise<{
        updatedAt: Date;
        updatedBy: string | undefined;
        general: any;
        commission: any;
        notifications: any;
        security: any;
    }>;
}
