import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import slugify from 'slugify';
import { ulid } from 'ulid';
import { ConfigService } from '@nestjs/config';
import { Merchant, MerchantStatus } from '../database/entities/supporting.entities';
import { User, UserRole } from '../database/entities/user.entity';
import { Order, OrderItem } from '../database/entities/order.entity';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @InjectRepository(Merchant) private readonly repo: Repository<Merchant>,
    @InjectRepository(OrderItem) private readonly itemsRepo: Repository<OrderItem>,
    private readonly dataSource: DataSource,
    private readonly paymentsService: PaymentsService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) { }

  // ── Register store ────────────────────────────
  async register(userId: string, dto: {
    storeName: string; description?: string; businessInfo?: any;
  }): Promise<Merchant> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) {
      if (existing.status === MerchantStatus.PENDING) {
        throw new ConflictException('You already have a pending merchant application.');
      }
      if (existing.status === MerchantStatus.APPROVED) {
        throw new ConflictException('You are already an approved merchant.');
      }

      // If rejected or suspended, allow updating and resetting to pending
      const slug = await this.generateSlug(dto.storeName);
      await this.repo.update(existing.id, {
        storeName: dto.storeName,
        storeSlug: slug,
        description: dto.description,
        businessInfo: dto.businessInfo,
        status: MerchantStatus.PENDING,
      });
      return this.findById(existing.id);
    }

    const slug = await this.generateSlug(dto.storeName);
    const merchant = this.repo.create({
      id: ulid(),
      userId,
      storeName: dto.storeName,
      storeSlug: slug,
      description: dto.description,
      businessInfo: dto.businessInfo,
      status: MerchantStatus.PENDING,
      commissionRate: 8.0,
    });
    const saved = await this.repo.save(merchant);
    this.logger.log(`Merchant registered: ${saved.id} (${saved.storeName})`);

    // Notify Sub-Admins of new application
    await this.notifications.notifySubAdmins(
      '🆕 New Merchant Application',
      `Store "${saved.storeName}" has applied for a merchant account and is awaiting approval.`,
      NotificationType.SYSTEM,
      '/subadmin/merchant-approvals'
    ).catch(err => this.logger.error('Failed to notify sub-admins of registration:', err.message));

    return saved;
  }

  // ── Get own store ─────────────────────────────
  async findByUserId(userId: string): Promise<Merchant | null> {
    return this.repo.findOne({ where: { userId } });
  }

  async findById(id: string): Promise<Merchant> {
    const m = await this.repo.findOne({ where: { id }, relations: ['user'] });
    if (!m) throw new NotFoundException(`Merchant ${id} not found`);
    return m;
  }

  async findBySlug(slug: string): Promise<Merchant> {
    const m = await this.repo.findOne({ where: { storeSlug: slug } });
    if (!m) throw new NotFoundException(`Store "${slug}" not found`);
    return m;
  }


  // ── Update store profile ──────────────────────
  async updateStore(merchantId: string, userId: string, dto: {
    storeName?: string; description?: string;
    logoUrl?: string; bannerUrl?: string;
    businessInfo?: any; returnPolicyDays?: number; isOnline?: boolean; storeSlug?: string;
  }): Promise<Merchant> {
    const merchant = await this.findById(merchantId);
    if (merchant.userId !== userId) throw new ForbiddenException();

    if (dto.storeName && dto.storeName !== merchant.storeName) {
      dto.storeSlug = await this.generateSlug(dto.storeName, merchantId);
    }
    return this.repo.save(Object.assign(merchant, dto));
  }

  async toggleOnline(merchantId: string, userId: string): Promise<{ isOnline: boolean }> {
    const merchant = await this.findById(merchantId);
    if (merchant.userId !== userId) throw new ForbiddenException();
    const isOnline = !merchant.isOnline;
    await this.repo.update(merchantId, { isOnline });
    return { isOnline };
  }

  // ── Earnings dashboard ────────────────────────
  async getEarnings(merchantId: string, period: 'week' | 'month' | 'year' = 'month') {
    const intervals: Record<string, string> = {
      week: '7 days',
      month: '30 days',
      year: '365 days',
    };

    const [summary, dailyBreakdown, topProducts, stripePlatformAvailable] = await Promise.all([
      // Totals for period
      this.dataSource.query(`
        SELECT
          COALESCE(SUM(oi.total_price), 0)::numeric        AS gross_revenue,
          COALESCE(SUM(oi.commission), 0)::numeric         AS total_commission,
          COALESCE(SUM(oi.merchant_earnings), 0)::numeric  AS net_earnings,
          COUNT(DISTINCT o.id)::int                        AS order_count,
          COUNT(oi.id)::int                                AS item_count
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.merchant_id = $1
          AND o.status NOT IN ('cancelled','refunded','return_requested','returned')
          AND o.created_at >= NOW() - INTERVAL '${intervals[period]}'
      `, [merchantId]),

      // Daily revenue breakdown
      this.dataSource.query(`
        SELECT
          DATE(o.created_at)                              AS date,
          COALESCE(SUM(oi.merchant_earnings), 0)::numeric AS earnings,
          COUNT(DISTINCT o.id)::int                       AS orders
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.merchant_id = $1
          AND o.status NOT IN ('cancelled','refunded')
          AND o.created_at >= NOW() - INTERVAL '${intervals[period]}'
        GROUP BY DATE(o.created_at)
        ORDER BY date ASC
      `, [merchantId]),

      // Top 5 products by revenue
      this.dataSource.query(`
        SELECT
          oi.product_id,
          oi.product_name,
          oi.product_image,
          SUM(oi.quantity)::int                          AS units_sold,
          SUM(oi.total_price)::numeric                   AS gross_revenue,
          SUM(oi.merchant_earnings)::numeric             AS net_earnings
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE oi.merchant_id = $1
          AND o.status NOT IN ('cancelled','refunded')
          AND o.created_at >= NOW() - INTERVAL '${intervals[period]}'
        GROUP BY oi.product_id, oi.product_name, oi.product_image
        ORDER BY gross_revenue DESC
        LIMIT 5
      `, [merchantId]),

      this.paymentsService.getPlatformAvailableBalance('usd').catch(() => 0),
    ]);

    const merchant = await this.repo.findOneBy({ id: merchantId });

    return {
      period,
      summary: {
        ...summary[0],
        availableBalance: merchant?.availableBalance ?? 0,
        stripePlatformAvailable,
      },
      dailyBreakdown,
      topProducts,
    };
  }

  // ── Payout request ────────────────────────────
  async requestPayout(merchantId: string, userId: string, amount: number) {
    const merchant = await this.findById(merchantId);
    if (merchant.userId !== userId) throw new ForbiddenException();
    if (!merchant.stripeAccountId) {
      throw new BadRequestException('Please connect your bank account before requesting a payout');
    }
    const minPayout = 20;
    if (amount < minPayout) throw new BadRequestException(`Minimum payout is $${minPayout}`);
    if (amount > Number(merchant.availableBalance)) {
      throw new BadRequestException('Insufficient balance for this payout amount');
    }

    const stripePlatformAvailable = await this.paymentsService.getPlatformAvailableBalance('usd').catch(() => 0);
    if (amount > stripePlatformAvailable) {
      throw new BadRequestException(
        `Stripe transferable balance is $${Number(stripePlatformAvailable).toFixed(2)} right now. Try a lower amount or process more test charges.`,
      );
    }

    const payout = await this.paymentsService.createPayout(merchant.stripeAccountId, amount);

    // Deduct from balance only after transfer succeeds.
    await this.repo.decrement({ id: merchantId }, 'availableBalance', amount);
    this.logger.log(`Payout requested: $${amount} from merchant ${merchantId}`);
    return {
      requested: true,
      transferId: payout.transferId,
      amount,
      remainingBalance: Number(merchant.availableBalance) - amount,
    };
  }

  async getPayoutHistory(merchantId: string, userId: string, limit = 20) {
    const merchant = await this.findById(merchantId);
    if (merchant.userId !== userId) throw new ForbiddenException();
    if (!merchant.stripeAccountId) return [];

    return this.paymentsService.listPayoutTransfers(merchant.stripeAccountId, limit);
  }

  async createConnectAccount(
    merchantId: string,
    userId: string,
    email: string,
    links?: { refreshUrl?: string; returnUrl?: string },
  ) {
    const merchant = await this.findById(merchantId);
    if (merchant.userId !== userId) throw new ForbiddenException();

    let accountId = merchant.stripeAccountId;

    if (!accountId) {
      const account = await this.paymentsService.createConnectAccount(email);
      accountId = account.accountId;
      await this.repo.update(merchantId, {
        stripeAccountId: accountId,
        businessInfo: {
          ...(merchant.businessInfo || {}),
          bankConnectedAt: new Date().toISOString(),
        },
      });
      this.logger.log(`Stripe Connect account created for merchant ${merchantId}: ${accountId}`);
    }

    const clientUrl = this.config.get<string>('CLIENT_URL') ?? 'http://localhost:4000';
    const returnUrl = links?.returnUrl || `${clientUrl}/merchant/payouts?stripe_onboarding=success`;
    const refreshUrl = links?.refreshUrl || `${clientUrl}/merchant/payouts?stripe_onboarding=refresh`;

    const link = await this.paymentsService.createConnectOnboardingLink(accountId, refreshUrl, returnUrl);

    return {
      accountId,
      onboardingUrl: link.url,
      expiresAt: link.expiresAt,
    };
  }

  async connectBankAccount(
    merchantId: string,
    userId: string,
    dto: { stripeAccountId: string; bankName?: string; accountLast4?: string },
  ) {
    const merchant = await this.findById(merchantId);
    if (merchant.userId !== userId) throw new ForbiddenException();

    const stripeAccountId = String(dto.stripeAccountId || '').trim();
    if (!stripeAccountId) {
      throw new BadRequestException('stripeAccountId is required');
    }

    const nextBusinessInfo = {
      ...(merchant.businessInfo || {}),
      bankName: dto.bankName?.trim() || (merchant.businessInfo as any)?.bankName,
      accountLast4: dto.accountLast4?.trim() || (merchant.businessInfo as any)?.accountLast4,
      bankConnectedAt: new Date().toISOString(),
    } as any;

    await this.repo.update(merchantId, {
      stripeAccountId,
      businessInfo: nextBusinessInfo,
    });

    this.logger.log(`Bank account connected for merchant ${merchantId}`);
    return this.findById(merchantId);
  }

  // ── Credit merchant earnings (called post-delivery) ──
  async creditEarnings(merchantId: string, amount: number): Promise<void> {
    await this.repo.increment({ id: merchantId }, 'availableBalance', amount);
    await this.repo.increment({ id: merchantId }, 'totalRevenue', amount);
  }

  async debitEarnings(merchantId: string, amount: number): Promise<void> {
    // We allow negative balance if it's a penalty
    await this.repo.decrement({ id: merchantId }, 'availableBalance', amount);
    await this.repo.decrement({ id: merchantId }, 'totalRevenue', amount);
  }

  // ── Admin operations ──────────────────────────
  async findAll(page = 1, limit = 20, status?: MerchantStatus) {
    const where: any = {};
    if (status) where.status = status;
    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async approve(id: string, commissionRate?: number): Promise<Merchant> {
    const merchant = await this.findById(id);
    if (merchant.status === MerchantStatus.APPROVED) {
      throw new BadRequestException('Merchant is already approved');
    }
    const updates: Partial<Merchant> = { status: MerchantStatus.APPROVED };
    if (commissionRate !== undefined) updates.commissionRate = commissionRate;
    await this.repo.update(id, updates);

    // Update user role to MERCHANT
    await this.dataSource.getRepository(User).update(merchant.userId, {
      role: UserRole.MERCHANT,
    });

    // Notify merchant user
    await this.notifications.createNotification(
      merchant.userId,
      '🎉 Store Approved',
      `Congratulations! Your store "${merchant.storeName}" has been approved. You can now start listing products.`,
      NotificationType.SYSTEM,
      '/merchant/dashboard'
    ).catch(err => this.logger.error(`Failed to notify approved merchant ${id}:`, err.message));

    this.logger.log(`Merchant approved: ${id}`);
    return this.findById(id);
  }

  async suspend(id: string, reason?: string): Promise<Merchant> {
    const merchant = await this.findById(id);
    await this.repo.update(id, { status: MerchantStatus.SUSPENDED });

    // Notify merchant user
    await this.notifications.createNotification(
      merchant.userId,
      '🚫 Account Suspended',
      `Your merchant account has been suspended${reason ? `: ${reason}` : ''}. Please contact support for more information.`,
      NotificationType.SYSTEM
    ).catch(err => this.logger.error(`Failed to notify suspended merchant ${id}:`, err.message));

    this.logger.warn(`Merchant suspended: ${id} — ${reason ?? 'no reason given'}`);
    return this.findById(id);
  }

  async setCommissionRate(id: string, rate: number): Promise<Merchant> {
    if (rate < 0 || rate > 50) throw new BadRequestException('Commission rate must be 0–50%');
    await this.repo.update(id, { commissionRate: rate });
    return this.findById(id);
  }

  // ── Private helpers ───────────────────────────
  private async generateSlug(name: string, excludeId?: string): Promise<string> {
    let base = slugify(name, { lower: true, strict: true });
    let slug = base;
    let n = 1;
    while (true) {
      const existing = await this.repo.findOne({ where: { storeSlug: slug } });
      if (!existing || existing.id === excludeId) break;
      slug = `${base}-${n++}`;
    }
    return slug;
  }
}
