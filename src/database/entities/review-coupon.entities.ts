import {
  Entity, Column, ManyToOne, JoinColumn, Index, Check,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Product } from './product.entity';
import { Order } from './order.entity';

// ─── REVIEW ──────────────────────────────────────────────────────────────────

export enum ReviewStatus {
  PENDING  = 'pending',   // awaiting moderation
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED  = 'flagged',
}

@Entity('reviews')
@Index(['productId'])
@Index(['userId'])
@Index(['orderId'])
@Index(['status'])
@Check('"rating" BETWEEN 1 AND 5')
export class Review extends BaseEntity {
  @Column({ name: 'product_id', length: 26 })
  productId!: string;

  @Column({ name: 'user_id', length: 26 })
  userId!: string;

  @Column({ name: 'order_id', length: 20 })
  orderId!: string;

  @Column({ type: 'smallint' })
  rating!: number;                      // 1–5

  @Column({ type: 'varchar', length: 120, nullable: true })
  title?: string;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'jsonb', default: [], nullable: true })
  images?: string[];                   // S3 CDN URLs

  @Column({ default: true, name: 'is_verified_purchase' })
  isVerifiedPurchase!: boolean;

  @Column({ default: 0, name: 'helpful_count' })
  helpfulCount!: number;                // users who found this helpful

  @Column({ default: 0, name: 'flag_count' })
  flagCount!: number;                  // number of times this review was flagged

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.APPROVED })
  status!: ReviewStatus;

  // Merchant reply
  @Column({ nullable: true, name: 'merchant_reply', type: 'text' })
  merchantReply?: string;

  @Column({ nullable: true, name: 'merchant_replied_at' })
  merchantRepliedAt?: Date;

  @Column({ nullable: true, name: 'merchant_id', length: 26 })
  merchantId?: string;

  // ── Relations ──
  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

// ─── REVIEW HELPFUL ──────────────────────────────────────────────────────────
// Tracks which users found which reviews helpful (prevents duplicate votes)

@Entity('review_helpful')
@Index(['reviewId', 'userId'], { unique: true })
export class ReviewHelpful {
  @Column({ primary: true, length: 26 })
  id!: string;

  @Column({ name: 'review_id', length: 26 })
  reviewId!: string;

  @Column({ name: 'user_id', length: 26 })
  userId!: string;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'NOW()' })
  createdAt!: Date;
}

// ─── COUPON ───────────────────────────────────────────────────────────────────

export enum CouponType {
  PERCENTAGE = 'percentage',   // e.g. 10% off
  FLAT       = 'flat',         // e.g. $10 off
  FREE_SHIP  = 'free_shipping',// free shipping
}

export enum CouponScope {
  ALL        = 'all',          // entire order
  CATEGORY   = 'category',     // specific category
  MERCHANT   = 'merchant',     // specific merchant's products
  PRODUCT    = 'product',      // specific product
  FIRST_ORDER= 'first_order',  // new customers only
}

@Entity('coupons')
@Index(['code'], { unique: true })
@Index(['isActive'])
@Index(['expiresAt'])
export class Coupon extends BaseEntity {
  @Column({ unique: true, length: 30 })
  code!: string;                         // e.g. ESUUQ10, SUMMER25

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: CouponType })
  type!: CouponType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value!: number;                        // % or $ amount

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'max_discount' })
  maxDiscount?: number;                 // cap on percentage discounts

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'min_order_value' })
  minOrderValue?: number;               // minimum cart total

  @Column({ type: 'enum', enum: CouponScope, default: CouponScope.ALL })
  scope!: CouponScope;

  @Column({ nullable: true, name: 'scope_id', length: 26 })
  scopeId?: string;                     // categoryId | merchantId | productId

  @Column({ nullable: true, name: 'max_uses' })
  maxUses?: number;                     // null = unlimited

  @Column({ default: 0, name: 'used_count' })
  usedCount!: number;

  @Column({ nullable: true, name: 'max_uses_per_user' })
  maxUsesPerUser?: number;              // null = unlimited per user

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ nullable: true, name: 'starts_at' })
  startsAt?: Date;

  @Column({ nullable: true, name: 'expires_at' })
  expiresAt?: Date;

  @Column({ nullable: true, name: 'created_by', length: 26 })
  createdBy?: string;                   // admin user ID
}

// ─── COUPON USAGE ─────────────────────────────────────────────────────────────
// Tracks per-user coupon redemptions

@Entity('coupon_usages')
@Index(['couponId', 'userId'])
@Index(['orderId'], { unique: true })
export class CouponUsage {
  @Column({ primary: true, length: 26 })
  id!: string;

  @Column({ name: 'coupon_id', length: 26 })
  couponId!: string;

  @Column({ name: 'user_id', length: 26 })
  userId!: string;

  @Column({ name: 'order_id', length: 20 })
  orderId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'discount_applied' })
  discountApplied!: number;

  @Column({ type: 'timestamptz', name: 'used_at', default: () => 'NOW()' })
  usedAt!: Date;
}
