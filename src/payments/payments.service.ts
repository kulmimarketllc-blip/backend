import {
  Injectable, BadRequestException, Logger, ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { Product } from '../database/entities/product.entity';
import { User, UserRole } from '../database/entities/user.entity';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {
    this.stripe = new Stripe(config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
    });
  }

  // ── Create PaymentIntent ──────────────────────
  async createPaymentIntent(
    amount: number,       // in dollars
    currency = 'usd',
    metadata: Record<string, string> = {},
  ) {
    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // dollars → cents
      currency,
      automatic_payment_methods: { enabled: true },
      metadata,
    });

    return {
      clientSecret: intent.client_secret,
      intentId: intent.id,
    };
  }

  // ── Confirm Payment (webhook) ─────────────────
  async handleWebhook(payload: Buffer, signature: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(`Webhook signature invalid: ${message}`);
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.onPaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'transfer.created':
        this.logger.log(`Payout transfer created: ${(event.data.object as any).id}`);
        break;
    }

    return { received: true };
  }

  // ── Merchant Payout ───────────────────────────
  async createPayout(merchantStripeAccountId: string, amountDollars: number) {
    const minPayout = this.config.get<number>('MIN_PAYOUT_AMOUNT', 20);
    if (amountDollars < minPayout) {
      throw new BadRequestException(`Minimum payout is $${minPayout}`);
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

  async listPayoutTransfers(merchantStripeAccountId: string, limit = 20) {
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

  // ── Create Stripe Connect Account (for merchants) ──
  async createConnectAccount(email: string) {
    const account = await this.stripe.accounts.create({
      type: 'express',
      email,
      capabilities: { transfers: { requested: true } },
    });
    return { accountId: account.id };
  }

  async createConnectOnboardingLink(accountId: string, refreshUrl: string, returnUrl: string) {
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

  // ── Refund ────────────────────────────────────
  async createRefund(paymentIntentId: string, amountCents?: number) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountCents ? { amount: amountCents } : {}),
    });
    return { refundId: refund.id, status: refund.status };
  }

  async confirmOrderPayment(paymentIntentId: string, user: User, orderId?: string) {
    if (!paymentIntentId) {
      throw new BadRequestException('paymentIntentId is required');
    }

    if (!user?.id) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const allowedRoles = [
      UserRole.ADMIN,
      UserRole.SUB_ADMIN,
      UserRole.CUSTOMER,
      UserRole.MERCHANT,
      UserRole.DELIVERY_PARTNER,
    ];

    const isCustomer = user.role === UserRole.CUSTOMER;

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(`Access denied for role: ${user.role}. Only Customers or Admins can confirm payments.`);
    }

    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (!intent) {
      throw new BadRequestException('Payment intent not found');
    }

    const order = orderId
      ? await this.ordersRepo.findOne({ where: { id: orderId } })
      : await this.ordersRepo.findOne({ where: { stripePaymentIntentId: paymentIntentId } });

    if (!order) {
      throw new BadRequestException('Order not found for this payment intent');
    }

    if (isCustomer && order.customerId !== user.id) {
      throw new ForbiddenException('You can only confirm your own orders');
    }

    if (order.stripePaymentIntentId !== paymentIntentId) {
      throw new BadRequestException('Payment intent does not belong to this order');
    }

    if (intent.status !== 'succeeded') {
      throw new BadRequestException(`Payment is not succeeded yet (status: ${intent.status})`);
    }

    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return {
        orderId: order.id,
        status: order.status,
        paymentStatus: intent.status,
      };
    }

    const nextHistory = [
      ...(order.statusHistory ?? []),
      {
        status: OrderStatus.CONFIRMED,
        changedAt: new Date().toISOString(),
        changedBy: user.id,
        note: 'Payment confirmed by direct verification API',
      },
    ];

    await this.ordersRepo.update(order.id, {
      status: OrderStatus.CONFIRMED,
      statusHistory: nextHistory,
    });

    return {
      orderId: order.id,
      status: OrderStatus.CONFIRMED,
      paymentStatus: intent.status,
    };
  }

  // ── Private ───────────────────────────────────
  private async onPaymentSucceeded(intent: Stripe.PaymentIntent) {
    this.logger.log(`Payment succeeded: ${intent.id} · $${intent.amount / 100}`);
    const order = await this.ordersRepo.findOne({ where: { stripePaymentIntentId: intent.id } });
    if (!order) {
      this.logger.warn(`No order found for payment intent ${intent.id}`);
      return;
    }

    const nextHistory = [
      ...(order.statusHistory ?? []),
      {
        status: OrderStatus.CONFIRMED,
        changedAt: new Date().toISOString(),
        note: 'Payment confirmed by Stripe webhook',
      },
    ];

    await this.ordersRepo.update(order.id, {
      status: OrderStatus.CONFIRMED,
      statusHistory: nextHistory,
    });
  }

  private async onPaymentFailed(intent: Stripe.PaymentIntent) {
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
        status: OrderStatus.CANCELLED,
        changedAt: new Date().toISOString(),
        note: 'Payment failed on Stripe',
      },
    ];

    await this.ordersRepo.update(order.id, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelReason: 'Payment failed',
      statusHistory: nextHistory,
    });
  }
}
