import { Entity, Column, OneToOne, OneToMany, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Product } from './product.entity';

// ─── MERCHANT ────────────────────────────────────
export enum MerchantStatus {
  PENDING  = 'pending',
  APPROVED = 'approved',
  SUSPENDED= 'suspended',
  REJECTED = 'rejected',
}

@Entity('merchants')
export class Merchant extends BaseEntity {
  @Column({ name: 'user_id', length: 26, unique: true })
  userId!: string;

  @Column({ length: 120, name: 'store_name' })
  storeName!: string;

  @Column({ unique: true, length: 130, name: 'store_slug' })
  storeSlug!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true, name: 'logo_url', length: 500 })
  logoUrl?: string;

  @Column({ nullable: true, name: 'banner_url', length: 500 })
  bannerUrl?: string;

  @Column({ type: 'enum', enum: MerchantStatus, default: MerchantStatus.PENDING })
  status!: MerchantStatus;

  @Column({ default: false, name: 'is_verified' })
  isVerified!: boolean;

  @Column({ default: true, name: 'is_online' })
  isOnline!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 8.0, name: 'commission_rate' })
  commissionRate!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_revenue' })
  totalRevenue!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'available_balance' })
  availableBalance!: number;

  @Column({ nullable: true, name: 'stripe_account_id' })
  stripeAccountId?: string;

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0, name: 'avg_rating' })
  avgRating!: number;

  @Column({ default: 0, name: 'return_policy_days' })
  returnPolicyDays!: number;

  @Column({ type: 'jsonb', nullable: true, name: 'business_info' })
  businessInfo?: {
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    bankName?: string;
    accountLast4?: string;
    bankConnectedAt?: string;
    rejectionReason?: string;
    rejectedAt?: string;
    rejectedBy?: string;
  };

  // ── Relations ──
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Product, (p) => p.merchant)
  products!: Product[];
}

// ─── ADDRESS ─────────────────────────────────────
export enum AddressType { HOME = 'home', WORK = 'work', OTHER = 'other' }

@Entity('addresses')
export class Address extends BaseEntity {
  @Column({ name: 'user_id', length: 26 })
  userId!: string;

  @Column({ type: 'enum', enum: AddressType, default: AddressType.HOME })
  type!: AddressType;

  @Column({ name: 'full_name', length: 160 })
  fullName!: string;

  @Column({ nullable: true, length: 160 })
  email?: string;

  @Column({ length: 20 })
  phone!: string;

  @Column({ length: 300, name: 'address_line1' })
  addressLine1!: string;

  @Column({ nullable: true, length: 200, name: 'address_line2' })
  addressLine2?: string;

  @Column({ length: 100 })
  city!: string;

  @Column({ length: 100 })
  state!: string;

  @Column({ length: 20, name: 'zip_code' })
  zipCode!: string;

  @Column({ length: 80, default: 'United States' })
  country!: string;

  @Column({ default: false, name: 'is_default' })
  isDefault!: boolean;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lat?: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, nullable: true })
  lng?: number;

  // ── Relations ──
  @ManyToOne(() => User, (u) => u.addresses)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

// ─── CATEGORY ────────────────────────────────────
@Entity('categories')
export class Category extends BaseEntity {
  @Column({ unique: true, length: 80 })
  name!: string;

  @Column({ unique: true, length: 90 })
  slug!: string;

  @Column({ nullable: true, name: 'icon_url', length: 500 })
  iconUrl?: string;

  @Column({ nullable: true, name: 'parent_id', length: 26 })
  parentId?: string;

  @Column({ default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ default: 0, name: 'sort_order' })
  sortOrder!: number;

  // ── Relations ──
  @OneToMany(() => Product, (p) => p.category)
  products!: Product[];
}

// ─── REVIEW ──────────────────────────────────────
@Entity('reviews')
@Index(['productId'])
@Index(['userId'])
export class Review extends BaseEntity {
  @Column({ name: 'product_id', length: 26 })
  productId!: string;

  @Column({ name: 'user_id', length: 26 })
  userId!: string;

  @Column({ name: 'order_id', length: 20 })
  orderId!: string;

  @Column({ type: 'smallint' })
  rating!: number;     // 1-5

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({ type: 'jsonb', default: [], nullable: true })
  images?: string[];

  @Column({ default: false, name: 'is_verified_purchase' })
  isVerifiedPurchase!: boolean;

  @Column({ nullable: true, name: 'merchant_reply', type: 'text' })
  merchantReply?: string;

  @Column({ nullable: true, name: 'merchant_replied_at' })
  merchantRepliedAt?: Date;

  // ── Relations ──
  @ManyToOne(() => Product, (p) => p.reviews)
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => User, (u) => u.reviews)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

// ─── WISHLIST ────────────────────────────────────
@Entity('wishlist')
@Index(['userId', 'productId'], { unique: true })
export class Wishlist extends BaseEntity {
  @Column({ name: 'user_id', length: 26 })
  userId!: string;

  @Column({ name: 'product_id', length: 26 })
  productId!: string;

  // ── Relations ──
  @ManyToOne(() => User, (u) => u.wishlist)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Product, (p) => p.wishlistEntries)
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}
