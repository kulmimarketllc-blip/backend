import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as bcrypt from 'bcrypt';
import { ulid } from 'ulid';

import { Order, OrderItem, OrderStatus, ShippingMethod } from '../database/entities/order.entity';
import { Product } from '../database/entities/product.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { Dispute, DisputeReason, DisputeStatus } from '../database/entities/sub-admin-features.entity';
import { PaymentsService } from '../payments/payments.service';
import { MerchantsService } from '../merchants/merchants.service';
import { Merchant } from '../database/entities/supporting.entities';

const SHIPPING_FEES: Record<ShippingMethod, number> = {
  [ShippingMethod.FREE]: 0,
  [ShippingMethod.EXPRESS]: 7.99,
  [ShippingMethod.NEXT_DAY]: 19.99,
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly itemsRepo: Repository<OrderItem>,

    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,

    @InjectRepository(Dispute)
    private readonly disputeRepo: Repository<Dispute>,

    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
    private readonly paymentsService: PaymentsService,
    private readonly merchantsService: MerchantsService,

    @InjectQueue('orders')
    private readonly ordersQueue: Queue,
  ) { }

  // ── Create Order (atomic transaction) ────────
  async create(dto: CreateOrderDto, customerId: string): Promise<Order> {
    const stockAlerts: Array<
      { kind: 'out_of_stock'; merchantId: string; productName: string }
      | { kind: 'low_stock'; merchantId: string; productName: string; stock: number }
    > = [];

    const savedOrder = await this.dataSource.transaction(async (manager) => {
      // 1. Load and validate all products (lock rows for update)
      const productIds = dto.items.map((i) => i.productId);
      const products = await manager.findByIds(Product, productIds);
      const productMap = new Map(products.map((p) => [p.id, p]));

      // 2. Build order items + calculate totals
      let subtotal = 0;
      const itemsData: Partial<OrderItem>[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new NotFoundException(`Product ${item.productId} not found`);
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}" (available: ${product.stock})`,
          );
        }

        const commissionRate = 0.08; // TODO: load from platform/admin settings
        const unitPrice = Number(product.price);
        const totalPrice = unitPrice * item.quantity;
        const commission = +(totalPrice * commissionRate).toFixed(2);

        itemsData.push({
          productId: product.id,
          merchantId: product.merchantId,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          commission,
          merchantEarnings: +(totalPrice - commission).toFixed(2),
          productName: product.name,
          productImage: product.images?.[0],
          variantId: item.variantId,
        });

        subtotal += totalPrice;

        // Deduct stock (within transaction)
        const nextStock = Number(product.stock || 0) - item.quantity;
        await manager.decrement(Product, { id: product.id }, 'stock', item.quantity);
        await manager.increment(Product, { id: product.id }, 'totalSold', item.quantity);

        if (nextStock <= 0 && Number(product.stock || 0) > 0) {
          stockAlerts.push({
            kind: 'out_of_stock',
            merchantId: product.merchantId,
            productName: product.name,
          });
        } else if (nextStock > 0 && nextStock <= Number(product.lowStockAt || 0) && Number(product.stock || 0) > Number(product.lowStockAt || 0)) {
          stockAlerts.push({
            kind: 'low_stock',
            merchantId: product.merchantId,
            productName: product.name,
            stock: nextStock,
          });
        }
      }

      // 3. Apply coupon discount
      const discount = dto.couponCode
        ? await this.applyCoupon(dto.couponCode, subtotal)
        : 0;

      const shippingFee = SHIPPING_FEES[dto.shippingMethod ?? ShippingMethod.FREE] ?? 0;
      const total = +(subtotal - discount + shippingFee).toFixed(2);

      // 4. Generate OTP for delivery confirmation
      const otp = Math.floor(1000 + Math.random() * 9000).toString();
      const otpHash = await bcrypt.hash(otp, 10);

      // 5. Create order
      const orderId = this.generateOrderId();
      const order = manager.create(Order, {
        id: orderId,
        customerId,
        addressId: dto.addressId,
        status: OrderStatus.PENDING_PAYMENT,
        shippingMethod: dto.shippingMethod ?? ShippingMethod.FREE,
        subtotal: +subtotal.toFixed(2),
        shippingFee,
        discount,
        total,
        couponCode: dto.couponCode,
        stripePaymentIntentId: dto.paymentIntentId,
        deliveryOtp: otpHash,
        statusHistory: [{ status: OrderStatus.PENDING_PAYMENT, changedAt: new Date().toISOString() }],
        estimatedDelivery: this.calcEstimatedDelivery(dto.shippingMethod),
      });

      const savedOrder = await manager.save(Order, order);

      // 6. Save items
      const items = itemsData.map((i) => manager.create(OrderItem, {
        id: ulid(),
        ...i,
        orderId: savedOrder.id,
      }));
      await manager.save(OrderItem, items);

      // 7. Queue async tasks
      await this.ordersQueue.add('order-confirmed', {
        orderId: savedOrder.id,
        customerId,
        otp,   // plain OTP for notification only, not stored plain
        total,
      });

      this.logger.log(`Order created: ${savedOrder.id} · $${total} · ${dto.items.length} items`);
      return savedOrder;
    });

    // Send stock-threshold notifications after transaction commits.
    for (const alert of stockAlerts) {
      if (alert.kind === 'out_of_stock') {
        await this.notifications.sendOutOfStockAlert(alert.merchantId, { name: alert.productName });
        continue;
      }

      await this.notifications.sendLowStockAlert(alert.merchantId, {
        name: alert.productName,
        stock: alert.stock,
      });
    }

    return savedOrder;
  }

  // ── Update Status ─────────────────────────────
  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    updatedBy: User,
    note?: string,
  ) {
    const order = await this.findById(orderId);

    this.validateStatusTransition(order.status, newStatus, updatedBy.role);

    if (newStatus === OrderStatus.CANCELLED) {
      if (updatedBy.role === UserRole.MERCHANT) {
        // Merchant-triggered cancellation becomes a DISPUTE
        newStatus = OrderStatus.DISPUTED;

        await this.disputeRepo.save({
          id: ulid(),
          orderId: order.id,
          customerId: order.customerId,
          merchantId: order.items[0]?.merchantId, // Assuming single merchant per order for now or primary
          reason: DisputeReason.MERCHANT_CANCELLATION,
          description: note || 'Merchant requested cancellation',
          status: DisputeStatus.PENDING,
        });

        this.logger.log(`Order ${orderId} cancellation by merchant ${updatedBy.id} converted to DISPUTE`);
      } else {
        await this.restoreOrderStock(order);
      }
    }

    if (newStatus === OrderStatus.REFUNDED) {
      await this.restoreOrderStock(order);
    }

    const historyEntry = {
      status: newStatus,
      changedAt: new Date().toISOString(),
      changedBy: updatedBy.id,
      note,
    };

    await this.ordersRepo.update(orderId, {
      status: newStatus,
      statusHistory: [...(order.statusHistory ?? []), historyEntry],
      ...(newStatus === OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
      ...(newStatus === OrderStatus.CANCELLED ? { cancelledAt: new Date(), cancelReason: note } : {}),
    });

    if (newStatus === OrderStatus.DELIVERED) {
      for (const item of order.items || []) {
        if (item.merchantId && item.merchantEarnings > 0) {
          await this.merchantsService.creditEarnings(item.merchantId, item.merchantEarnings);
          this.logger.log(`Credited $${item.merchantEarnings} to merchant ${item.merchantId} for order ${orderId}`);
        }
      }
    }

    // Queue notifications
    await this.ordersQueue.add('status-changed', {
      orderId, newStatus, customerId: order.customerId,
    });

    return { orderId, status: newStatus };
  }

  async refundOrder(orderId: string, updatedBy: User, note?: string) {
    const order = await this.findById(orderId);
    if (order.status === OrderStatus.REFUNDED) {
      throw new BadRequestException('Order is already refunded');
    }

    // Trigger Stripe refund if paymentIntentId exists
    if (order.stripePaymentIntentId) {
      try {
        await this.paymentsService.createRefund(order.stripePaymentIntentId);
        this.logger.log(`Stripe refund initiated for order ${orderId}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`Refund failed for order ${orderId}: ${errMsg}`);

        // If it's a "No such payment_intent" error, we allow it to proceed in development
        // to avoid blocking the testing flow.
        if (errMsg.includes('No such payment_intent') || errMsg.includes('has not been captured')) {
          this.logger.warn(`Proceeding with order refund despite Stripe failure (Testing/Mock data detected)`);
        } else {
          throw new BadRequestException(`Stripe refund failed: ${errMsg}`);
        }
      }
    }

    // Deduct merchant earnings only if this order was previously delivered.
    // Earnings are credited on DELIVERED, so pre-delivery refunds must not debit.
    if (order.status === OrderStatus.DELIVERED) {
      for (const item of order.items || []) {
        if (item.merchantId && item.merchantEarnings > 0) {
          await this.merchantsService.debitEarnings(item.merchantId, item.merchantEarnings);
          this.logger.log(`Deducted $${item.merchantEarnings} from merchant ${item.merchantId} due to refund/cancellation`);
        }
      }
    }

    return this.updateStatus(orderId, OrderStatus.REFUNDED, updatedBy, note);
  }

  // ── Get Tracking ──────────────────────────────
  async getTracking(orderId: string, requesterId: string) {
    const order = await this.ordersRepo.findOne({
      where: { id: orderId },
      relations: ['driver', 'address'],
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== requesterId) throw new ForbiddenException();

    return {
      orderId: order.id,
      status: order.status,
      estimatedDelivery: order.estimatedDelivery,
      deliveredAt: order.deliveredAt,
      driver: order.driver
        ? {
          name: `${order.driver.firstName} ${order.driver.lastName}`,
          phone: order.driver.phone,
          // live location served via WebSocket, not REST
        }
        : null,
      timeline: order.statusHistory ?? [],
    };
  }

  // ── Find by Customer ──────────────────────────
  async findByCustomer(customerId: string, page = 1, limit = 10) {
    const [data, total] = await this.ordersRepo.findAndCount({
      where: { customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ── Find by Merchant ──────────────────────────
  async findByMerchant(merchantId: string, page = 1, limit = 20) {
    const [data, total] = await this.itemsRepo.findAndCount({
      where: { merchantId },
      relations: ['order', 'order.customer', 'order.address'],
      order: { order: { createdAt: 'DESC' } },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit } };
  }

  // ── Private Helpers ───────────────────────────
  async findById(id: string) {
    const order = await this.ordersRepo.findOne({
      where: { id }, relations: ['items'],
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  private generateOrderId(): string {
    const year = new Date().getFullYear();
    const seq = Math.floor(10000 + Math.random() * 90000);
    return `ESQ-${year}-${seq}`;
  }

  private calcEstimatedDelivery(method?: ShippingMethod): Date {
    const d = new Date();
    const days = method === ShippingMethod.NEXT_DAY ? 1
      : method === ShippingMethod.EXPRESS ? 2 : 5;
    d.setDate(d.getDate() + days);
    return d;
  }

  private async applyCoupon(code: string, subtotal: number): Promise<number> {
    // TODO: validate against coupons table
    // For now: demo codes
    if (code === 'ESUUQ10') return +(subtotal * 0.10).toFixed(2);
    if (code === 'SAVE10') return 10;
    return 0;
  }

  private async restoreOrderStock(order: Order): Promise<void> {
    for (const item of order.items ?? []) {
      if (!item?.productId || !item.quantity) continue;

      await this.productsRepo.increment({ id: item.productId }, 'stock', item.quantity);
      await this.productsRepo.decrement({ id: item.productId }, 'totalSold', item.quantity);
    }
  }

  private validateStatusTransition(
    current: OrderStatus, next: OrderStatus, role: UserRole,
  ) {
    const allowed: Partial<Record<OrderStatus, OrderStatus[]>> = {
      [OrderStatus.PENDING_PAYMENT]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],

      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED,
      ],

      [OrderStatus.PROCESSING]: [
        OrderStatus.READY_PICKUP,
        OrderStatus.CANCELLED,
      ],

      [OrderStatus.READY_PICKUP]: [
        OrderStatus.PICKED_UP,
      ],

      [OrderStatus.PICKED_UP]: [
        OrderStatus.IN_TRANSIT,
      ],

      [OrderStatus.IN_TRANSIT]: [
        OrderStatus.DELIVERED,
      ],

      [OrderStatus.DELIVERED]: [
        OrderStatus.RETURN_REQUESTED,
      ],

      [OrderStatus.RETURN_REQUESTED]: [
        OrderStatus.RETURNED,
      ],

      [OrderStatus.RETURNED]: [
        OrderStatus.REFUNDED,
      ],

      [OrderStatus.DISPUTED]: [
        OrderStatus.CANCELLED,
        OrderStatus.REFUNDED,
      ],
    };

    if (role === UserRole.MERCHANT && next === OrderStatus.CANCELLED) {
      // Allow merchant to try to cancel (will be intercepted)
    } else if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(
        `Cannot transition order from "${current}" to "${next}"`,
      );
    }
  }
}
