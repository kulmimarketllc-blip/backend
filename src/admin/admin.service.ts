import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not, IsNull, MoreThanOrEqual, Brackets } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { Product, ProductStatus } from '../database/entities/product.entity';
import { Merchant, MerchantStatus, Category } from '../database/entities/supporting.entities';
import { OrderItem } from '../database/entities/order.entity';
import { PlatformSetting } from '../database/entities/platform-setting.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)    private readonly usersRepo: Repository<User>,
    @InjectRepository(Order)   private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    @InjectRepository(Merchant) private readonly merchantsRepo: Repository<Merchant>,
    @InjectRepository(OrderItem) private readonly orderItemsRepo: Repository<OrderItem>,
    @InjectRepository(PlatformSetting) private readonly settingsRepo: Repository<PlatformSetting>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Dashboard Stats ───────────────────────────
  async getDashboardStats() {
    const now = new Date();
    const since30 = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const since14 = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    const since365 = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));
    const since7 = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const since24h = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const activeUserBase = { deletedAt: IsNull(), isActive: true };
    const excludedRevenueStatuses = [OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.PENDING_PAYMENT];

    try {
      const [
        totalUsers,
        customers,
        merchants,
        drivers,
        newCustomersThisMonth,
        totalOrders,
        confirmedOrders,
        inTransitOrders,
        deliveredOrders,
        cancelledOrders,
        todayOrders,
        revenueRows,
        recentOrders,
        signupRows,
        revenueTrendRows,
        categoryRows,
      ] = await Promise.all([
        this.usersRepo.count({ where: activeUserBase }),
        this.usersRepo.count({ where: { ...activeUserBase, role: UserRole.CUSTOMER } }),
        this.usersRepo.count({ where: { ...activeUserBase, role: UserRole.MERCHANT } }),
        this.usersRepo.count({ where: { ...activeUserBase, role: UserRole.DELIVERY_PARTNER } }),
        this.usersRepo.count({ where: { ...activeUserBase, role: UserRole.CUSTOMER, createdAt: MoreThanOrEqual(since30) } }),

        this.ordersRepo.count(),
        this.ordersRepo.count({ where: { status: OrderStatus.CONFIRMED } }),
        this.ordersRepo.count({ where: { status: OrderStatus.IN_TRANSIT } }),
        this.ordersRepo.count({ where: { status: OrderStatus.DELIVERED } }),
        this.ordersRepo.count({ where: { status: OrderStatus.CANCELLED } }),
        this.ordersRepo.count({ where: { createdAt: MoreThanOrEqual(since24h) } }),

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
          where: { createdAt: MoreThanOrEqual(since14), deletedAt: IsNull() },
          order: { createdAt: 'ASC' },
        }),

        this.ordersRepo.find({
          where: {
            createdAt: MoreThanOrEqual(since365),
            status: Not(In(excludedRevenueStatuses)),
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
          .where('o.status NOT IN (:...excluded)', { excluded: [OrderStatus.CANCELLED, OrderStatus.REFUNDED] })
          .andWhere('o.created_at >= :since30', { since30 })
          .groupBy('c.name')
          .orderBy('revenue', 'DESC')
          .limit(8)
          .getRawMany(),
      ]);

      const foldByDay = <T>(rows: T[], pickDate: (row: T) => any, pickValue: (row: T) => number) => {
        const bucket = new Map<string, number>();
        for (const row of rows) {
          const val = pickDate(row);
          if (!val) continue;
          const d = new Date(val);
          if (isNaN(d.getTime())) continue;
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
    } catch (error) {
      this.logger.error(`Failed to fetch dashboard stats: ${error.message}`, error.stack);
      throw error;
    }
  }

  // ── Order Status Counts ───────────────────────
  async getOrderStatusCounts() {
    const rows = await this.ordersRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(o.id)', 'count')
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    const counts: Record<string, number> = {
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

  // ── Orders management ─────────────────────────
  async getOrders(page = 1, limit = 20, status?: OrderStatus, search?: string) {
    const qb = this.ordersRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'c')
      .leftJoinAndSelect('o.items', 'i')
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) qb.andWhere('o.status = :status', { status });
    if (search) qb.andWhere('o.id LIKE :s', { s: `%${search}%` });

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ── Platform revenue report ───────────────────
  async getRevenueReport(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    const periodDays: Record<'week' | 'month' | 'quarter' | 'year', number> = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    };
    const sinceDate = new Date(Date.now() - (periodDays[period] * 24 * 60 * 60 * 1000));
    const revenueExcludedStatuses = [OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.PENDING_PAYMENT];

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
        .leftJoin(Merchant, 'm', 'm.id = oi.merchant_id')
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
        .where('o.status = :refunded', { refunded: OrderStatus.REFUNDED })
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

  // ── Product moderation ────────────────────────
  async getPendingProducts(page = 1, limit = 20) {
    const [data, total] = await this.productsRepo.findAndCount({
      where: { status: 'pending_review' as any },
      relations: ['merchant', 'category'],
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit } };
  }

  async getProducts(page = 1, limit = 20, status?: ProductStatus, search?: string) {
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

  async approveProduct(productId: string) {
    const product = await this.productsRepo.findOneBy({ id: productId });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    product.status = ProductStatus.ACTIVE;
    return this.productsRepo.save(product);
  }

  async rejectProduct(productId: string) {
    const product = await this.productsRepo.findOneBy({ id: productId });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    product.status = ProductStatus.REJECTED;
    return this.productsRepo.save(product);
  }

  async removeProduct(productId: string) {
    const product = await this.productsRepo.findOneBy({ id: productId });
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    await this.productsRepo.softDelete(productId);
    return { message: 'Product removed' };
  }

  async getMerchants(page = 1, limit = 20, status?: MerchantStatus, search?: string) {
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
      qb.andWhere(new Brackets((sub) => {
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

    const perfMap = new Map(
      performanceRows.map((row) => [
        row.merchantId,
        {
          orders: Number(row.orders || 0),
          revenue: Number(row.revenue || 0),
          commission: Number(row.commission || 0),
        },
      ]),
    );

    const rows = data.map((merchant: any) => {
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

  async getCustomers(page = 1, limit = 20, status?: 'active' | 'inactive', search?: string) {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.CUSTOMER })
      .andWhere('u.deleted_at IS NULL')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status === 'active') qb.andWhere('u.is_active = true');
    if (status === 'inactive') qb.andWhere('u.is_active = false');

    if (search) {
      qb.andWhere(new Brackets((sub) => {
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
          .andWhere('o.status NOT IN (:...excluded)', { excluded: [OrderStatus.CANCELLED, OrderStatus.REFUNDED, OrderStatus.PENDING_PAYMENT] })
          .groupBy('o.customer_id')
          .getRawMany()
      : [];

    const spendMap = new Map(
      spendRows.map((row) => [
        row.customerId,
        {
          ordersCount: Number(row.ordersCount || 0),
          totalSpent: Number(row.totalSpent || 0),
          lastOrderAt: row.lastOrderAt || null,
        },
      ]),
    );

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

  async getDeliveryPartners(page = 1, limit = 20, status?: 'online' | 'busy' | 'offline', search?: string) {
    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.role = :role', { role: UserRole.DELIVERY_PARTNER })
      .andWhere('u.deleted_at IS NULL')
      .orderBy('u.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere(new Brackets((sub) => {
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
          .addSelect(
            `COALESCE(SUM(CASE WHEN o.status IN ('ready_for_pickup','picked_up','in_transit') THEN 1 ELSE 0 END), 0)`,
            'activeDeliveries',
          )
          .addSelect(
            `COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN 1 ELSE 0 END), 0)`,
            'completedDeliveries',
          )
          .addSelect(
            `COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END), 0)`,
            'cancelledDeliveries',
          )
          .addSelect('COALESCE(SUM(o.shipping_fee), 0)', 'earnings')
          .where('o.driver_id IN (:...driverIds)', { driverIds })
          .groupBy('o.driver_id')
          .getRawMany()
      : [];

    const deliveryMap = new Map(
      deliveryRows.map((row) => [
        row.driverId,
        {
          totalDeliveries: Number(row.totalDeliveries || 0),
          activeDeliveries: Number(row.activeDeliveries || 0),
          completedDeliveries: Number(row.completedDeliveries || 0),
          cancelledDeliveries: Number(row.cancelledDeliveries || 0),
          earnings: Number(row.earnings || 0),
        },
      ]),
    );

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
    if (!saved?.value) return defaults;

    const value = saved.value as Record<string, any>;
    return {
      general: { ...defaults.general, ...(value.general || {}) },
      commission: { ...defaults.commission, ...(value.commission || {}) },
      notifications: { ...defaults.notifications, ...(value.notifications || {}) },
      security: { ...defaults.security, ...(value.security || {}) },
      updatedAt: saved.updatedAt,
      updatedBy: saved.updatedBy,
    };
  }

  async updateSettings(payload: Record<string, any>, userId: string) {
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

  private getDefaultSettings() {
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

  private async ensureSettingsTable() {
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

  // ── Platform health ───────────────────────────
  async getPlatformHealth() {
    const stuckThreshold = new Date(Date.now() - (24 * 60 * 60 * 1000));

    const [stuckOrders, lowStockProducts, pendingMerchants] = await Promise.all([
      this.ordersRepo
        .createQueryBuilder('o')
        .where('o.status IN (:...statuses)', { statuses: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] })
        .andWhere('o.updated_at < :threshold', { threshold: stuckThreshold })
        .getCount(),

      this.productsRepo
        .createQueryBuilder('p')
        .where('p.stock < :limit', { limit: 5 })
        .andWhere('p.stock > 0')
        .andWhere('p.status = :status', { status: 'active' })
        .andWhere('p.deleted_at IS NULL')
        .getCount(),

      this.merchantsRepo.count({ where: { status: MerchantStatus.PENDING } }),
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
}
