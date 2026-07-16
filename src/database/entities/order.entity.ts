import {
  Entity, Column, ManyToOne, OneToMany, Index, JoinColumn, BeforeInsert,
} from 'typeorm';
import { User } from './user.entity';
import { Address } from './supporting.entities';
import { Product } from './product.entity';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  READY_PICKUP = 'ready_for_pickup',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURN_REQUESTED = 'return_requested',
  RETURNED = 'returned',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
}


export enum ShippingMethod {
  FREE = 'free',
  EXPRESS = 'express',
  NEXT_DAY = 'next_day',
}

@Entity('orders')
@Index(['customerId'])
@Index(['driverId'])
@Index(['status'])
@Index(['createdAt'])
export class Order {
  // Human-readable order ID: ESQ-2026-00848
  @Column({ primary: true, length: 20 })
  id!: string;

  @Column({ name: 'customer_id', length: 26 })
  customerId!: string;

  @Column({ name: 'driver_id', length: 26, nullable: true })
  driverId?: string;

  @Column({ name: 'address_id', length: 26 })
  addressId!: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status!: OrderStatus;

  @Column({ type: 'enum', enum: ShippingMethod, default: ShippingMethod.FREE, name: 'shipping_method' })
  shippingMethod!: ShippingMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'shipping_fee' })
  shippingFee!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total!: number;

  @Column({ nullable: true, name: 'coupon_code', length: 30 })
  couponCode?: string;

  @Column({ nullable: true, name: 'stripe_payment_intent_id' })
  stripePaymentIntentId?: string;

  @Column({ nullable: true, name: 'delivery_otp' })
  deliveryOtp?: string;  // bcrypt hashed

  @Column({ type: 'jsonb', default: [], name: 'status_history' })
  statusHistory!: StatusHistoryEntry[];

  @Column({ nullable: true, name: 'estimated_delivery' })
  estimatedDelivery?: Date;

  @Column({ nullable: true, name: 'delivered_at' })
  deliveredAt?: Date;

  @Column({ nullable: true, name: 'cancelled_at' })
  cancelledAt?: Date;

  @Column({ nullable: true, name: 'cancel_reason' })
  cancelReason?: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ── Relations ──
  @ManyToOne(() => User, (u) => u.orders)
  @JoinColumn({ name: 'customer_id' })
  customer!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver?: User;

  @ManyToOne(() => Address)
  @JoinColumn({ name: 'address_id' })
  address!: Address;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items!: OrderItem[];

  @BeforeInsert()
  setTimestamps() {
    const now = new Date();
    this.createdAt = now;
    this.updatedAt = now;
  }
}

export interface StatusHistoryEntry {
  status: OrderStatus;
  changedAt: string;
  changedBy?: string;
  note?: string;
}

// ─────────────────────────────────────────────────
@Entity('order_items')
export class OrderItem {
  @Column({ primary: true, length: 26 })
  id!: string;

  @Column({ name: 'order_id', length: 20 })
  orderId!: string;

  @Column({ name: 'product_id', length: 26 })
  productId!: string;

  @Column({ name: 'merchant_id', length: 26 })
  merchantId!: string;

  @Column()
  quantity!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice!: number;

  @Column({ nullable: true, name: 'variant_id' })
  variantId?: string;

  @Column({ type: 'jsonb', nullable: true, name: 'variant_snapshot' })
  variantSnapshot?: Record<string, string>;

  // Snapshot of product name/image at time of order (survives product deletion)
  @Column({ name: 'product_name' })
  productName!: string;

  @Column({ nullable: true, name: 'product_image' })
  productImage?: string;

  // Commission tracking
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'merchant_earnings' })
  merchantEarnings!: number;

  // ── Relations ──
  @ManyToOne(() => Order, (o) => o.items)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
