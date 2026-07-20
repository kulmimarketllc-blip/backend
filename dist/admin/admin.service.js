"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../database/entities/user.entity");
const order_entity_1 = require("../database/entities/order.entity");
const product_entity_1 = require("../database/entities/product.entity");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const order_entity_2 = require("../database/entities/order.entity");
const platform_setting_entity_1 = require("../database/entities/platform-setting.entity");
let AdminService = AdminService_1 = class AdminService {
    constructor(usersRepo, ordersRepo, productsRepo, merchantsRepo, orderItemsRepo, settingsRepo, dataSource) {
        this.usersRepo = usersRepo;
        this.ordersRepo = ordersRepo;
        this.productsRepo = productsRepo;
        this.merchantsRepo = merchantsRepo;
        this.orderItemsRepo = orderItemsRepo;
        this.settingsRepo = settingsRepo;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AdminService_1.name);
    }
    async getDashboardStats() {
        const now = new Date();
        const since30 = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        const since14 = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
        const since365 = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
        const since7 = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        const since24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const activeUserBase = { deletedAt: (0, typeorm_2.IsNull)(), isActive: true };
        const excludedRevenueStatuses = [order_entity_1.OrderStatus.CANCELLED, order_entity_1.OrderStatus.REFUNDED, order_entity_1.OrderStatus.PENDING_PAYMENT];
        try {
            const [totalUsers, customers, merchants, drivers, newCustomersThisMonth, totalOrders, confirmedOrders, inTransitOrders, deliveredOrders, cancelledOrders, todayOrders, revenueRows, recentOrders, signupRows, revenueTrendRows, categoryRows,] = await Promise.all([
                this.usersRepo.count({ where: activeUserBase }),
                this.usersRepo.count({ where: { ...activeUserBase, role: user_entity_1.UserRole.CUSTOMER } }),
                this.usersRepo.count({ where: { ...activeUserBase, role: user_entity_1.UserRole.MERCHANT } }),
                this.usersRepo.count({ where: { ...activeUserBase, role: user_entity_1.UserRole.DELIVERY_PARTNER } }),
                this.usersRepo.count({ where: { ...activeUserBase, role: user_entity_1.UserRole.CUSTOMER, createdAt: (0, typeorm_2.MoreThanOrEqual)(since30) } }),
                this.ordersRepo.count(),
                this.ordersRepo.count({ where: { status: order_entity_1.OrderStatus.CONFIRMED } }),
                this.ordersRepo.count({ where: { status: order_entity_1.OrderStatus.IN_TRANSIT } }),
                this.ordersRepo.count({ where: { status: order_entity_1.OrderStatus.DELIVERED } }),
                this.ordersRepo.count({ where: { status: order_entity_1.OrderStatus.CANCELLED } }),
                this.ordersRepo.count({ where: { createdAt: (0, typeorm_2.MoreThanOrEqual)(since24h) } }),
                this.ordersRepo
                    .createQueryBuilder('o')
                    .select('COALESCE(SUM(o.total), 0)', 'gross_revenue')
                    .addSelect(`COALESCE(SUM(CASE WHEN o.created_at >= :since30 THEN o.total ELSE 0 END), 0)`, 'revenue_this_month')
                    .addSelect(`COALESCE(SUM(CASE WHEN o.created_at >= :since7 THEN o.total ELSE 0 END), 0)`, 'revenue_this_week')
                    .addSelect(`COALESCE(SUM(CASE WHEN o.created_at >= :since24h THEN o.total ELSE 0 END), 0)`, 'revenue_today')
                    .addSelect('COALESCE(AVG(o.total), 0)', 'avg_order_value')
                    .where('o.status NOT IN (:...excluded)', { excluded: excludedRevenueStatuses })
                    .setParameters({ since30, since7, since24h })
                    .getRawMany(),
                this.ordersRepo.find({
                    order: { createdAt: 'DESC' },
                    take: 10,
                    relations: ['customer'],
                }),
                this.usersRepo.find({
                    where: { createdAt: (0, typeorm_2.MoreThanOrEqual)(since14), deletedAt: (0, typeorm_2.IsNull)() },
                    order: { createdAt: 'ASC' },
                }),
                this.ordersRepo.find({
                    where: {
                        createdAt: (0, typeorm_2.MoreThanOrEqual)(since365),
                        status: (0, typeorm_2.Not)((0, typeorm_2.In)(excludedRevenueStatuses)),
                    },
                    order: { createdAt: 'ASC' },
                }),
                this.orderItemsRepo
                    .createQueryBuilder('oi')
                    .leftJoin('oi.order', 'o')
                    .leftJoin('oi.product', 'p')
                    .leftJoin('p.category', 'c')
                    .select('c.name', 'category')
                    .addSelect('COALESCE(SUM(oi.total_price), 0)', 'revenue')
                    .where('o.status NOT IN (:...excluded)', { excluded: [order_entity_1.OrderStatus.CANCELLED, order_entity_1.OrderStatus.REFUNDED] })
                    .andWhere('o.created_at >= :since30', { since30 })
                    .groupBy('c.name')
                    .orderBy('revenue', 'DESC')
                    .limit(8)
                    .getRawMany(),
            ]);
            const foldByDay = (rows, pickDate, pickValue) => {
                const bucket = new Map();
                for (const row of rows) {
                    const val = pickDate(row);
                    if (!val)
                        continue;
                    const d = new Date(val);
                    if (isNaN(d.getTime()))
                        continue;
                    const key = d.toISOString().slice(0, 10);
                    bucket.set(key, (bucket.get(key) || 0) + pickValue(row));
                }
                return Array.from(bucket.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([date, value]) => ({ date, value }));
            };
            const signupsTrend = foldByDay(signupRows, (row) => row.createdAt, () => 1)
                .map((row) => ({ date: row.date, count: row.value }));
            const revenueTrend = foldByDay(revenueTrendRows, (row) => row.createdAt, (row) => Number(row.total || 0))
                .map((row) => ({ date: row.date, revenue: row.value }));
            const revenueStats = revenueRows[0] || {
                gross_revenue: 0,
                revenue_this_month: 0,
                revenue_this_week: 0,
                revenue_today: 0,
                avg_order_value: 0,
            };
            const userStats = {
                total: totalUsers,
                customers,
                merchants,
                drivers,
                new_this_month: newCustomersThisMonth,
            };
            const orderStats = {
                total: totalOrders,
                confirmed: confirmedOrders,
                in_transit: inTransitOrders,
                delivered: deliveredOrders,
                cancelled: cancelledOrders,
                today: todayOrders,
            };
            return {
                users: userStats,
                orders: orderStats,
                revenue: revenueStats,
                categoryBreakdown: categoryRows,
                recentOrders,
                charts: { signupsTrend, revenueTrend },
            };
        }
        catch (error) {
            this.logger.error(`Failed to fetch dashboard stats: ${error.message}`, error.stack);
            throw error;
        }
    }
    async getOrderStatusCounts() {
        const rows = await this.ordersRepo
            .createQueryBuilder('o')
            .select('o.status', 'status')
            .addSelect('COUNT(o.id)', 'count')
            .groupBy('o.status')
            .getRawMany();
        const counts = {
            all: 0,
            pending_payment: 0,
            processing: 0,
            in_transit: 0,
            delivered: 0,
            cancelled: 0,
            return_requested: 0,
        };
        for (const row of rows) {
            const status = String(row.status || '').toLowerCase();
            const count = Number(row.count || 0);
            counts.all += count;
            if (status in counts) {
                counts[status] = count;
            }
            if (['returned', 'refunded'].includes(status)) {
                counts.return_requested += count;
            }
        }
        return counts;
    }
    async getOrders(page = 1, limit = 20, status, search) {
        const qb = this.ordersRepo
            .createQueryBuilder('o')
            .leftJoinAndSelect('o.customer', 'c')
            .leftJoinAndSelect('o.items', 'i')
            .orderBy('o.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (status)
            qb.andWhere('o.status = :status', { status });
        if (search)
            qb.andWhere('o.id LIKE :s', { s: `%${search}%` });
        const [data, total] = await qb.getManyAndCount();
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async getRevenueReport(period = 'month') {
        const periodDays = {
            week: 7,
            month: 30,
            quarter: 90,
            year: 365,
        };
        const sinceDate = new Date(Date.now() - (periodDays[period] * 24 * 60 * 60 * 1000));
        const revenueExcludedStatuses = [order_entity_1.OrderStatus.CANCELLED, order_entity_1.OrderStatus.REFUNDED, order_entity_1.OrderStatus.PENDING_PAYMENT];
        const [totals, byMerchant, byCategory, refunds] = await Promise.all([
            this.orderItemsRepo
                .createQueryBuilder('oi')
                .leftJoin('oi.order', 'o')
                .select('COALESCE(SUM(oi.total_price), 0)', 'gross_revenue')
                .addSelect('COALESCE(SUM(oi.commission), 0)', 'platform_commission')
                .addSelect('COALESCE(SUM(oi.merchant_earnings), 0)', 'merchant_payouts')
                .addSelect('COUNT(DISTINCT o.id)', 'orders')
                .addSelect('COUNT(DISTINCT o.customer_id)', 'unique_customers')
                .where('o.status NOT IN (:...excluded)', { excluded: revenueExcludedStatuses })
                .andWhere('o.created_at >= :sinceDate', { sinceDate })
                .getRawOne(),
            this.orderItemsRepo
                .createQueryBuilder('oi')
                .leftJoin('oi.order', 'o')
                .leftJoin(supporting_entities_1.Merchant, 'm', 'm.id = oi.merchant_id')
                .select('m.id', 'merchant_id')
                .addSelect('m.store_name', 'store_name')
                .addSelect('COALESCE(SUM(oi.total_price), 0)', 'revenue')
                .addSelect('COALESCE(SUM(oi.commission), 0)', 'commission')
                .addSelect('COUNT(DISTINCT o.id)', 'orders')
                .where('o.status NOT IN (:...excluded)', { excluded: revenueExcludedStatuses })
                .andWhere('o.created_at >= :sinceDate', { sinceDate })
                .groupBy('m.id')
                .addGroupBy('m.store_name')
                .orderBy('revenue', 'DESC')
                .limit(10)
                .getRawMany(),
            this.orderItemsRepo
                .createQueryBuilder('oi')
                .leftJoin('oi.order', 'o')
                .leftJoin('oi.product', 'p')
                .leftJoin('p.category', 'c')
                .select('c.name', 'name')
                .addSelect('COALESCE(SUM(oi.total_price), 0)', 'revenue')
                .where('o.status NOT IN (:...excluded)', { excluded: revenueExcludedStatuses })
                .andWhere('o.created_at >= :sinceDate', { sinceDate })
                .groupBy('c.name')
                .orderBy('revenue', 'DESC')
                .getRawMany(),
            this.ordersRepo
                .createQueryBuilder('o')
                .select('COUNT(*)', 'count')
                .addSelect('COALESCE(SUM(o.total), 0)', 'amount')
                .where('o.status = :refunded', { refunded: order_entity_1.OrderStatus.REFUNDED })
                .andWhere('o.updated_at >= :sinceDate', { sinceDate })
                .getRawOne(),
        ]);
        return {
            period,
            totals: totals || {
                gross_revenue: 0,
                platform_commission: 0,
                merchant_payouts: 0,
                orders: 0,
                unique_customers: 0,
            },
            byMerchant,
            byCategory,
            refunds: refunds || { count: 0, amount: 0 },
        };
    }
    async getPendingProducts(page = 1, limit = 20) {
        const [data, total] = await this.productsRepo.findAndCount({
            where: { status: 'pending_review' },
            relations: ['merchant', 'category'],
            order: { createdAt: 'ASC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit } };
    }
    async getProducts(page = 1, limit = 20, status, search) {
        const qb = this.productsRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.merchant', 'm')
            .leftJoinAndSelect('p.category', 'c')
            .orderBy('p.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (status) {
            qb.andWhere('p.status = :status', { status });
        }
        if (search) {
            qb.andWhere('(p.name ILIKE :search OR p.sku ILIKE :search OR p.id ILIKE :search)', {
                search: `%${search}%`,
            });
        }
        const [data, total] = await qb.getManyAndCount();
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async approveProduct(productId) {
        const product = await this.productsRepo.findOneBy({ id: productId });
        if (!product) {
            throw new common_1.NotFoundException(`Product ${productId} not found`);
        }
        product.status = product_entity_1.ProductStatus.ACTIVE;
        return this.productsRepo.save(product);
    }
    async rejectProduct(productId) {
        const product = await this.productsRepo.findOneBy({ id: productId });
        if (!product) {
            throw new common_1.NotFoundException(`Product ${productId} not found`);
        }
        product.status = product_entity_1.ProductStatus.REJECTED;
        return this.productsRepo.save(product);
    }
    async removeProduct(productId) {
        const product = await this.productsRepo.findOneBy({ id: productId });
        if (!product) {
            throw new common_1.NotFoundException(`Product ${productId} not found`);
        }
        await this.productsRepo.softDelete(productId);
        return { message: 'Product removed' };
    }
    async getMerchants(page = 1, limit = 20, status, search) {
        const qb = this.merchantsRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.user', 'u')
            .loadRelationCountAndMap('m.productsCount', 'm.products')
            .orderBy('m.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (status) {
            qb.andWhere('m.status = :status', { status });
        }
        if (search) {
            qb.andWhere(new typeorm_2.Brackets((sub) => {
                sub
                    .where('m.storeName ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.firstName ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.lastName ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.email ILIKE :search', { search: `%${search}%` });
            }));
        }
        const [data, total] = await qb.getManyAndCount();
        const merchantIds = data.map((m) => m.id);
        const performanceRows = merchantIds.length
            ? await this.orderItemsRepo
                .createQueryBuilder('oi')
                .select('oi.merchant_id', 'merchantId')
                .addSelect('COUNT(DISTINCT oi.order_id)', 'orders')
                .addSelect('COALESCE(SUM(oi.total_price), 0)', 'revenue')
                .addSelect('COALESCE(SUM(oi.commission), 0)', 'commission')
                .where('oi.merchant_id IN (:...merchantIds)', { merchantIds })
                .groupBy('oi.merchant_id')
                .getRawMany()
            : [];
        const perfMap = new Map(performanceRows.map((row) => [
            row.merchantId,
            {
                orders: Number(row.orders || 0),
                revenue: Number(row.revenue || 0),
                commission: Number(row.commission || 0),
            },
        ]));
        const rows = data.map((merchant) => {
            const perf = perfMap.get(merchant.id) || { orders: 0, revenue: 0, commission: 0 };
            return {
                id: merchant.id,
                storeName: merchant.storeName,
                ownerName: `${merchant.user?.firstName || ''} ${merchant.user?.lastName || ''}`.trim() || merchant.user?.email || '-',
                ownerEmail: merchant.user?.email || null,
                status: merchant.status,
                isVerified: merchant.isVerified,
                commissionRate: Number(merchant.commissionRate || 0),
                avgRating: Number(merchant.avgRating || 0),
                productsCount: Number(merchant.productsCount || 0),
                ordersCount: perf.orders,
                revenue: perf.revenue,
                commission: perf.commission,
                createdAt: merchant.createdAt,
            };
        });
        return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async getCustomers(page = 1, limit = 20, status, search) {
        const qb = this.usersRepo
            .createQueryBuilder('u')
            .where('u.role = :role', { role: user_entity_1.UserRole.CUSTOMER })
            .andWhere('u.deleted_at IS NULL')
            .orderBy('u.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (status === 'active')
            qb.andWhere('u.is_active = true');
        if (status === 'inactive')
            qb.andWhere('u.is_active = false');
        if (search) {
            qb.andWhere(new typeorm_2.Brackets((sub) => {
                sub
                    .where('u.firstName ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.lastName ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.email ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.phone ILIKE :search', { search: `%${search}%` });
            }));
        }
        const [data, total] = await qb.getManyAndCount();
        const customerIds = data.map((user) => user.id);
        const spendRows = customerIds.length
            ? await this.ordersRepo
                .createQueryBuilder('o')
                .select('o.customer_id', 'customerId')
                .addSelect('COUNT(o.id)', 'ordersCount')
                .addSelect('COALESCE(SUM(o.total), 0)', 'totalSpent')
                .addSelect('MAX(o.created_at)', 'lastOrderAt')
                .where('o.customer_id IN (:...customerIds)', { customerIds })
                .andWhere('o.status NOT IN (:...excluded)', { excluded: [order_entity_1.OrderStatus.CANCELLED, order_entity_1.OrderStatus.REFUNDED, order_entity_1.OrderStatus.PENDING_PAYMENT] })
                .groupBy('o.customer_id')
                .getRawMany()
            : [];
        const spendMap = new Map(spendRows.map((row) => [
            row.customerId,
            {
                ordersCount: Number(row.ordersCount || 0),
                totalSpent: Number(row.totalSpent || 0),
                lastOrderAt: row.lastOrderAt || null,
            },
        ]));
        const rows = data.map((user) => {
            const stats = spendMap.get(user.id) || { ordersCount: 0, totalSpent: 0, lastOrderAt: null };
            return {
                id: user.id,
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                email: user.email,
                phone: user.phone || null,
                isActive: user.isActive,
                isVerified: user.isVerified,
                joinedAt: user.createdAt,
                ordersCount: stats.ordersCount,
                totalSpent: stats.totalSpent,
                lastOrderAt: stats.lastOrderAt,
            };
        });
        return { data: rows, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async getDeliveryPartners(page = 1, limit = 20, status, search) {
        const qb = this.usersRepo
            .createQueryBuilder('u')
            .where('u.role = :role', { role: user_entity_1.UserRole.DELIVERY_PARTNER })
            .andWhere('u.deleted_at IS NULL')
            .orderBy('u.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        if (search) {
            qb.andWhere(new typeorm_2.Brackets((sub) => {
                sub
                    .where('u.firstName ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.lastName ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.email ILIKE :search', { search: `%${search}%` })
                    .orWhere('u.phone ILIKE :search', { search: `%${search}%` });
            }));
        }
        const [data, total] = await qb.getManyAndCount();
        const driverIds = data.map((user) => user.id);
        const deliveryRows = driverIds.length
            ? await this.ordersRepo
                .createQueryBuilder('o')
                .select('o.driver_id', 'driverId')
                .addSelect('COUNT(o.id)', 'totalDeliveries')
                .addSelect(`COALESCE(SUM(CASE WHEN o.status IN ('ready_for_pickup','picked_up','in_transit') THEN 1 ELSE 0 END), 0)`, 'activeDeliveries')
                .addSelect(`COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END), 0)`, 'completedDeliveries')
                .addSelect(`COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END), 0)`, 'cancelledDeliveries')
                .addSelect('COALESCE(SUM(o.shipping_fee), 0)', 'earnings')
                .where('o.driver_id IN (:...driverIds)', { driverIds })
                .groupBy('o.driver_id')
                .getRawMany()
            : [];
        const deliveryMap = new Map(deliveryRows.map((row) => [
            row.driverId,
            {
                totalDeliveries: Number(row.totalDeliveries || 0),
                activeDeliveries: Number(row.activeDeliveries || 0),
                completedDeliveries: Number(row.completedDeliveries || 0),
                cancelledDeliveries: Number(row.cancelledDeliveries || 0),
                earnings: Number(row.earnings || 0),
            },
        ]));
        const onlineThreshold = new Date(Date.now() - (24 * 60 * 60 * 1000));
        const rows = data
            .map((user) => {
            const stats = deliveryMap.get(user.id) || {
                totalDeliveries: 0,
                activeDeliveries: 0,
                completedDeliveries: 0,
                cancelledDeliveries: 0,
                earnings: 0,
            };
            const computedStatus = !user.isActive
                ? 'offline'
                : stats.activeDeliveries > 0
                    ? 'busy'
                    : user.lastLoginAt && new Date(user.lastLoginAt) >= onlineThreshold
                        ? 'online'
                        : 'offline';
            const successRateBase = stats.completedDeliveries + stats.cancelledDeliveries;
            const successRate = successRateBase > 0
                ? Math.round((stats.completedDeliveries / successRateBase) * 100)
                : 0;
            return {
                id: user.id,
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                email: user.email,
                phone: user.phone || null,
                isActive: user.isActive,
                status: computedStatus,
                totalDeliveries: stats.totalDeliveries,
                activeDeliveries: stats.activeDeliveries,
                completedDeliveries: stats.completedDeliveries,
                cancelledDeliveries: stats.cancelledDeliveries,
                successRate,
                earnings: stats.earnings,
                lastLoginAt: user.lastLoginAt,
                joinedAt: user.createdAt,
            };
        })
            .filter((row) => (status ? row.status === status : true));
        return {
            data: rows,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getSettings() {
        await this.ensureSettingsTable();
        const defaults = this.getDefaultSettings();
        const saved = await this.settingsRepo.findOne({ where: { key: 'admin_platform_settings' } });
        if (!saved?.value)
            return defaults;
        const value = saved.value;
        return {
            general: { ...defaults.general, ...(value.general || {}) },
            commission: { ...defaults.commission, ...(value.commission || {}) },
            notifications: { ...defaults.notifications, ...(value.notifications || {}) },
            security: { ...defaults.security, ...(value.security || {}) },
            updatedAt: saved.updatedAt,
            updatedBy: saved.updatedBy,
        };
    }
    async updateSettings(payload, userId) {
        await this.ensureSettingsTable();
        const current = await this.getSettings();
        const merged = {
            general: { ...(current.general || {}), ...(payload?.general || {}) },
            commission: { ...(current.commission || {}), ...(payload?.commission || {}) },
            notifications: { ...(current.notifications || {}), ...(payload?.notifications || {}) },
            security: { ...(current.security || {}), ...(payload?.security || {}) },
        };
        const existing = await this.settingsRepo.findOne({ where: { key: 'admin_platform_settings' } });
        const record = existing
            ? Object.assign(existing, { value: merged, updatedBy: userId })
            : this.settingsRepo.create({
                key: 'admin_platform_settings',
                value: merged,
                updatedBy: userId,
            });
        const saved = await this.settingsRepo.save(record);
        return {
            ...merged,
            updatedAt: saved.updatedAt,
            updatedBy: saved.updatedBy,
        };
    }
    getDefaultSettings() {
        return {
            general: {
                platformName: 'ESUUQ Marketplace',
                supportEmail: 'support@esuuq.com',
                defaultCurrency: 'USD',
                timezone: 'America/Chicago',
            },
            commission: {
                defaultRate: 10,
                electronicsRate: 8,
                fashionRate: 12,
                foodGroceryRate: 15,
                payoutCycle: 'weekly',
            },
            notifications: {
                newOrderAlerts: true,
                merchantApprovals: true,
                lowStockAlerts: true,
                revenueReports: false,
            },
            security: {
                twoFactorRequired: true,
                apiRateLimiting: true,
                auditLog: true,
            },
        };
    }
    async ensureSettingsTable() {
        await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS "platform_settings" (
        "id" character varying(26) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP WITH TIME ZONE,
        "key" character varying(100) NOT NULL,
        "value" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "updated_by" character varying(26),
        CONSTRAINT "PK_platform_settings_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_platform_settings_key" UNIQUE ("key")
      )
    `);
        await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_platform_settings_key" ON "platform_settings" ("key")
    `);
    }
    async getPlatformHealth() {
        const stuckThreshold = new Date(Date.now() - (24 * 60 * 60 * 1000));
        const [stuckOrders, lowStockProducts, pendingMerchants] = await Promise.all([
            this.ordersRepo
                .createQueryBuilder('o')
                .where('o.status IN (:...statuses)', { statuses: [order_entity_1.OrderStatus.CONFIRMED, order_entity_1.OrderStatus.PROCESSING] })
                .andWhere('o.updated_at < :threshold', { threshold: stuckThreshold })
                .getCount(),
            this.productsRepo
                .createQueryBuilder('p')
                .where('p.stock < :limit', { limit: 5 })
                .andWhere('p.stock > 0')
                .andWhere('p.status = :status', { status: 'active' })
                .andWhere('p.deleted_at IS NULL')
                .getCount(),
            this.merchantsRepo.count({ where: { status: supporting_entities_1.MerchantStatus.PENDING } }),
        ]);
        return {
            alerts: {
                stuckOrders,
                lowStockProducts,
                pendingMerchants,
            },
            healthy: Object.values({
                stuckOrders,
                lowStockProducts,
                pendingMerchants,
            }).every((v) => v === 0),
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = AdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(3, (0, typeorm_1.InjectRepository)(supporting_entities_1.Merchant)),
    __param(4, (0, typeorm_1.InjectRepository)(order_entity_2.OrderItem)),
    __param(5, (0, typeorm_1.InjectRepository)(platform_setting_entity_1.PlatformSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], AdminService);
//# sourceMappingURL=admin.service.js.map