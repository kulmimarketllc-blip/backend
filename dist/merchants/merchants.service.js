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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MerchantsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const slugify_1 = __importDefault(require("slugify"));
const ulid_1 = require("ulid");
const config_1 = require("@nestjs/config");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const user_entity_1 = require("../database/entities/user.entity");
const order_entity_1 = require("../database/entities/order.entity");
const payments_service_1 = require("../payments/payments.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../database/entities/notification.entity");
let MerchantsService = MerchantsService_1 = class MerchantsService {
    constructor(repo, itemsRepo, dataSource, paymentsService, notifications, config) {
        this.repo = repo;
        this.itemsRepo = itemsRepo;
        this.dataSource = dataSource;
        this.paymentsService = paymentsService;
        this.notifications = notifications;
        this.config = config;
        this.logger = new common_1.Logger(MerchantsService_1.name);
    }
    async register(userId, dto) {
        const existing = await this.repo.findOne({ where: { userId } });
        if (existing) {
            if (existing.status === supporting_entities_1.MerchantStatus.PENDING) {
                throw new common_1.ConflictException('You already have a pending merchant application.');
            }
            if (existing.status === supporting_entities_1.MerchantStatus.APPROVED) {
                throw new common_1.ConflictException('You are already an approved merchant.');
            }
            const slug = await this.generateSlug(dto.storeName);
            await this.repo.update(existing.id, {
                storeName: dto.storeName,
                storeSlug: slug,
                description: dto.description,
                businessInfo: dto.businessInfo,
                status: supporting_entities_1.MerchantStatus.PENDING,
            });
            return this.findById(existing.id);
        }
        const slug = await this.generateSlug(dto.storeName);
        const merchant = this.repo.create({
            id: (0, ulid_1.ulid)(),
            userId,
            storeName: dto.storeName,
            storeSlug: slug,
            description: dto.description,
            businessInfo: dto.businessInfo,
            status: supporting_entities_1.MerchantStatus.PENDING,
            commissionRate: 8.0,
        });
        const saved = await this.repo.save(merchant);
        this.logger.log(`Merchant registered: ${saved.id} (${saved.storeName})`);
        await this.notifications.notifySubAdmins('🆕 New Merchant Application', `Store "${saved.storeName}" has applied for a merchant account and is awaiting approval.`, notification_entity_1.NotificationType.SYSTEM, '/subadmin/merchant-approvals').catch(err => this.logger.error('Failed to notify sub-admins of registration:', err.message));
        return saved;
    }
    async findByUserId(userId) {
        return this.repo.findOne({ where: { userId } });
    }
    async findById(id) {
        const m = await this.repo.findOne({ where: { id }, relations: ['user'] });
        if (!m)
            throw new common_1.NotFoundException(`Merchant ${id} not found`);
        return m;
    }
    async findBySlug(slug) {
        const m = await this.repo.findOne({ where: { storeSlug: slug } });
        if (!m)
            throw new common_1.NotFoundException(`Store "${slug}" not found`);
        return m;
    }
    async updateStore(merchantId, userId, dto) {
        const merchant = await this.findById(merchantId);
        if (merchant.userId !== userId)
            throw new common_1.ForbiddenException();
        if (dto.storeName && dto.storeName !== merchant.storeName) {
            dto.storeSlug = await this.generateSlug(dto.storeName, merchantId);
        }
        return this.repo.save(Object.assign(merchant, dto));
    }
    async toggleOnline(merchantId, userId) {
        const merchant = await this.findById(merchantId);
        if (merchant.userId !== userId)
            throw new common_1.ForbiddenException();
        const isOnline = !merchant.isOnline;
        await this.repo.update(merchantId, { isOnline });
        return { isOnline };
    }
    async getEarnings(merchantId, period = 'month') {
        const intervals = {
            week: '7 days',
            month: '30 days',
            year: '365 days',
        };
        const [summary, dailyBreakdown, topProducts, stripePlatformAvailable] = await Promise.all([
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
    async requestPayout(merchantId, userId, amount) {
        const merchant = await this.findById(merchantId);
        if (merchant.userId !== userId)
            throw new common_1.ForbiddenException();
        if (!merchant.stripeAccountId) {
            throw new common_1.BadRequestException('Please connect your bank account before requesting a payout');
        }
        const minPayout = 20;
        if (amount < minPayout)
            throw new common_1.BadRequestException(`Minimum payout is $${minPayout}`);
        if (amount > Number(merchant.availableBalance)) {
            throw new common_1.BadRequestException('Insufficient balance for this payout amount');
        }
        const stripePlatformAvailable = await this.paymentsService.getPlatformAvailableBalance('usd').catch(() => 0);
        if (amount > stripePlatformAvailable) {
            throw new common_1.BadRequestException(`Stripe transferable balance is $${Number(stripePlatformAvailable).toFixed(2)} right now. Try a lower amount or process more test charges.`);
        }
        const payout = await this.paymentsService.createPayout(merchant.stripeAccountId, amount);
        await this.repo.decrement({ id: merchantId }, 'availableBalance', amount);
        this.logger.log(`Payout requested: $${amount} from merchant ${merchantId}`);
        return {
            requested: true,
            transferId: payout.transferId,
            amount,
            remainingBalance: Number(merchant.availableBalance) - amount,
        };
    }
    async getPayoutHistory(merchantId, userId, limit = 20) {
        const merchant = await this.findById(merchantId);
        if (merchant.userId !== userId)
            throw new common_1.ForbiddenException();
        if (!merchant.stripeAccountId)
            return [];
        return this.paymentsService.listPayoutTransfers(merchant.stripeAccountId, limit);
    }
    async createConnectAccount(merchantId, userId, email, links) {
        const merchant = await this.findById(merchantId);
        if (merchant.userId !== userId)
            throw new common_1.ForbiddenException();
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
        const clientUrl = this.config.get('CLIENT_URL') ?? 'http://localhost:4000';
        const returnUrl = links?.returnUrl || `${clientUrl}/merchant/payouts?stripe_onboarding=success`;
        const refreshUrl = links?.refreshUrl || `${clientUrl}/merchant/payouts?stripe_onboarding=refresh`;
        const link = await this.paymentsService.createConnectOnboardingLink(accountId, refreshUrl, returnUrl);
        return {
            accountId,
            onboardingUrl: link.url,
            expiresAt: link.expiresAt,
        };
    }
    async connectBankAccount(merchantId, userId, dto) {
        const merchant = await this.findById(merchantId);
        if (merchant.userId !== userId)
            throw new common_1.ForbiddenException();
        const stripeAccountId = String(dto.stripeAccountId || '').trim();
        if (!stripeAccountId) {
            throw new common_1.BadRequestException('stripeAccountId is required');
        }
        const nextBusinessInfo = {
            ...(merchant.businessInfo || {}),
            bankName: dto.bankName?.trim() || merchant.businessInfo?.bankName,
            accountLast4: dto.accountLast4?.trim() || merchant.businessInfo?.accountLast4,
            bankConnectedAt: new Date().toISOString(),
        };
        await this.repo.update(merchantId, {
            stripeAccountId,
            businessInfo: nextBusinessInfo,
        });
        this.logger.log(`Bank account connected for merchant ${merchantId}`);
        return this.findById(merchantId);
    }
    async creditEarnings(merchantId, amount) {
        await this.repo.increment({ id: merchantId }, 'availableBalance', amount);
        await this.repo.increment({ id: merchantId }, 'totalRevenue', amount);
    }
    async debitEarnings(merchantId, amount) {
        await this.repo.decrement({ id: merchantId }, 'availableBalance', amount);
        await this.repo.decrement({ id: merchantId }, 'totalRevenue', amount);
    }
    async findAll(page = 1, limit = 20, status) {
        const where = {};
        if (status)
            where.status = status;
        const [data, total] = await this.repo.findAndCount({
            where,
            relations: ['user'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async approve(id, commissionRate) {
        const merchant = await this.findById(id);
        if (merchant.status === supporting_entities_1.MerchantStatus.APPROVED) {
            throw new common_1.BadRequestException('Merchant is already approved');
        }
        const updates = { status: supporting_entities_1.MerchantStatus.APPROVED };
        if (commissionRate !== undefined)
            updates.commissionRate = commissionRate;
        await this.repo.update(id, updates);
        await this.dataSource.getRepository(user_entity_1.User).update(merchant.userId, {
            role: user_entity_1.UserRole.MERCHANT,
        });
        await this.notifications.createNotification(merchant.userId, '🎉 Store Approved', `Congratulations! Your store "${merchant.storeName}" has been approved. You can now start listing products.`, notification_entity_1.NotificationType.SYSTEM, '/merchant/dashboard').catch(err => this.logger.error(`Failed to notify approved merchant ${id}:`, err.message));
        this.logger.log(`Merchant approved: ${id}`);
        return this.findById(id);
    }
    async suspend(id, reason) {
        const merchant = await this.findById(id);
        await this.repo.update(id, { status: supporting_entities_1.MerchantStatus.SUSPENDED });
        await this.notifications.createNotification(merchant.userId, '🚫 Account Suspended', `Your merchant account has been suspended${reason ? `: ${reason}` : ''}. Please contact support for more information.`, notification_entity_1.NotificationType.SYSTEM).catch(err => this.logger.error(`Failed to notify suspended merchant ${id}:`, err.message));
        this.logger.warn(`Merchant suspended: ${id} — ${reason ?? 'no reason given'}`);
        return this.findById(id);
    }
    async setCommissionRate(id, rate) {
        if (rate < 0 || rate > 50)
            throw new common_1.BadRequestException('Commission rate must be 0–50%');
        await this.repo.update(id, { commissionRate: rate });
        return this.findById(id);
    }
    async generateSlug(name, excludeId) {
        let base = (0, slugify_1.default)(name, { lower: true, strict: true });
        let slug = base;
        let n = 1;
        while (true) {
            const existing = await this.repo.findOne({ where: { storeSlug: slug } });
            if (!existing || existing.id === excludeId)
                break;
            slug = `${base}-${n++}`;
        }
        return slug;
    }
};
exports.MerchantsService = MerchantsService;
exports.MerchantsService = MerchantsService = MerchantsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(supporting_entities_1.Merchant)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.OrderItem)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        payments_service_1.PaymentsService,
        notifications_service_1.NotificationsService,
        config_1.ConfigService])
], MerchantsService);
//# sourceMappingURL=merchants.service.js.map