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
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = __importDefault(require("stripe"));
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../database/entities/order.entity");
const product_entity_1 = require("../database/entities/product.entity");
const user_entity_1 = require("../database/entities/user.entity");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(config, ordersRepo, productsRepo) {
        this.config = config;
        this.ordersRepo = ordersRepo;
        this.productsRepo = productsRepo;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        this.stripe = new stripe_1.default(config.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2023-10-16',
        });
    }
    async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
        const intent = await this.stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency,
            automatic_payment_methods: { enabled: true },
            metadata,
        });
        return {
            clientSecret: intent.client_secret,
            intentId: intent.id,
        };
    }
    async handleWebhook(payload, signature) {
        const secret = this.config.get('STRIPE_WEBHOOK_SECRET') ?? '';
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(payload, signature, secret);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            throw new common_1.BadRequestException(`Webhook signature invalid: ${message}`);
        }
        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.onPaymentSucceeded(event.data.object);
                break;
            case 'payment_intent.payment_failed':
                await this.onPaymentFailed(event.data.object);
                break;
            case 'transfer.created':
                this.logger.log(`Payout transfer created: ${event.data.object.id}`);
                break;
        }
        return { received: true };
    }
    async createPayout(merchantStripeAccountId, amountDollars) {
        const minPayout = this.config.get('MIN_PAYOUT_AMOUNT', 20);
        if (amountDollars < minPayout) {
            throw new common_1.BadRequestException(`Minimum payout is $${minPayout}`);
        }
        const transfer = await this.stripe.transfers.create({
            amount: Math.round(amountDollars * 100),
            currency: 'usd',
            destination: merchantStripeAccountId,
        });
        this.logger.log(`Payout transfer: ${transfer.id} · $${amountDollars} → ${merchantStripeAccountId}`);
        return { transferId: transfer.id, amount: amountDollars };
    }
    async getPlatformAvailableBalance(currency = 'usd') {
        const balance = await this.stripe.balance.retrieve();
        const item = (balance.available || []).find((entry) => entry.currency === currency.toLowerCase());
        return (item?.amount || 0) / 100;
    }
    async listPayoutTransfers(merchantStripeAccountId, limit = 20) {
        const transfers = await this.stripe.transfers.list({
            destination: merchantStripeAccountId,
            limit,
        });
        return (transfers.data || []).map((transfer) => ({
            id: transfer.id,
            amount: (transfer.amount || 0) / 100,
            currency: String(transfer.currency || 'usd').toUpperCase(),
            createdAt: new Date((transfer.created || 0) * 1000).toISOString(),
            status: transfer.reversed ? 'reversed' : 'completed',
            destination: transfer.destination,
            description: transfer.description || null,
        }));
    }
    async createConnectAccount(email) {
        const account = await this.stripe.accounts.create({
            type: 'express',
            email,
            capabilities: { transfers: { requested: true } },
        });
        return { accountId: account.id };
    }
    async createConnectOnboardingLink(accountId, refreshUrl, returnUrl) {
        const accountLink = await this.stripe.accountLinks.create({
            account: accountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });
        return {
            url: accountLink.url,
            expiresAt: accountLink.expires_at,
        };
    }
    async createRefund(paymentIntentId, amountCents) {
        const refund = await this.stripe.refunds.create({
            payment_intent: paymentIntentId,
            ...(amountCents ? { amount: amountCents } : {}),
        });
        return { refundId: refund.id, status: refund.status };
    }
    async confirmOrderPayment(paymentIntentId, user, orderId) {
        if (!paymentIntentId) {
            throw new common_1.BadRequestException('paymentIntentId is required');
        }
        if (!user?.id) {
            throw new common_1.ForbiddenException('Authenticated user is required');
        }
        const allowedRoles = [
            user_entity_1.UserRole.ADMIN,
            user_entity_1.UserRole.SUB_ADMIN,
            user_entity_1.UserRole.CUSTOMER,
            user_entity_1.UserRole.MERCHANT,
            user_entity_1.UserRole.DELIVERY_PARTNER,
        ];
        const isCustomer = user.role === user_entity_1.UserRole.CUSTOMER;
        if (!allowedRoles.includes(user.role)) {
            throw new common_1.ForbiddenException(`Access denied for role: ${user.role}. Only Customers or Admins can confirm payments.`);
        }
        const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
        if (!intent) {
            throw new common_1.BadRequestException('Payment intent not found');
        }
        const order = orderId
            ? await this.ordersRepo.findOne({ where: { id: orderId } })
            : await this.ordersRepo.findOne({ where: { stripePaymentIntentId: paymentIntentId } });
        if (!order) {
            throw new common_1.BadRequestException('Order not found for this payment intent');
        }
        if (isCustomer && order.customerId !== user.id) {
            throw new common_1.ForbiddenException('You can only confirm your own orders');
        }
        if (order.stripePaymentIntentId !== paymentIntentId) {
            throw new common_1.BadRequestException('Payment intent does not belong to this order');
        }
        if (intent.status !== 'succeeded') {
            throw new common_1.BadRequestException(`Payment is not succeeded yet (status: ${intent.status})`);
        }
        if (order.status !== order_entity_1.OrderStatus.PENDING_PAYMENT) {
            return {
                orderId: order.id,
                status: order.status,
                paymentStatus: intent.status,
            };
        }
        const nextHistory = [
            ...(order.statusHistory ?? []),
            {
                status: order_entity_1.OrderStatus.CONFIRMED,
                changedAt: new Date().toISOString(),
                changedBy: user.id,
                note: 'Payment confirmed by direct verification API',
            },
        ];
        await this.ordersRepo.update(order.id, {
            status: order_entity_1.OrderStatus.CONFIRMED,
            statusHistory: nextHistory,
        });
        return {
            orderId: order.id,
            status: order_entity_1.OrderStatus.CONFIRMED,
            paymentStatus: intent.status,
        };
    }
    async onPaymentSucceeded(intent) {
        this.logger.log(`Payment succeeded: ${intent.id} · $${intent.amount / 100}`);
        const order = await this.ordersRepo.findOne({ where: { stripePaymentIntentId: intent.id } });
        if (!order) {
            this.logger.warn(`No order found for payment intent ${intent.id}`);
            return;
        }
        const nextHistory = [
            ...(order.statusHistory ?? []),
            {
                status: order_entity_1.OrderStatus.CONFIRMED,
                changedAt: new Date().toISOString(),
                note: 'Payment confirmed by Stripe webhook',
            },
        ];
        await this.ordersRepo.update(order.id, {
            status: order_entity_1.OrderStatus.CONFIRMED,
            statusHistory: nextHistory,
        });
    }
    async onPaymentFailed(intent) {
        this.logger.warn(`Payment failed: ${intent.id}`);
        const order = await this.ordersRepo.findOne({
            where: { stripePaymentIntentId: intent.id },
            relations: ['items'],
        });
        if (!order) {
            this.logger.warn(`No order found for failed payment intent ${intent.id}`);
            return;
        }
        for (const item of order.items ?? []) {
            await this.productsRepo.increment({ id: item.productId }, 'stock', item.quantity);
            await this.productsRepo.decrement({ id: item.productId }, 'totalSold', item.quantity);
        }
        const nextHistory = [
            ...(order.statusHistory ?? []),
            {
                status: order_entity_1.OrderStatus.CANCELLED,
                changedAt: new Date().toISOString(),
                note: 'Payment failed on Stripe',
            },
        ];
        await this.ordersRepo.update(order.id, {
            status: order_entity_1.OrderStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelReason: 'Payment failed',
            statusHistory: nextHistory,
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map