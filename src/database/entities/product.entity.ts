import {
  Entity, Column, ManyToOne, OneToMany, Index, JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Merchant, Category, Wishlist } from './supporting.entities';
import { OrderItem } from './order.entity';
import { Review } from './review-coupon.entities';

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  PENDING_REVIEW = 'pending_review',
  REJECTED = 'rejected',
}

@Entity('products')
@Index(['slug'], { unique: true })
@Index(['status'])
@Index(['merchantId'])
export class Product extends BaseEntity {
  @Column({ name: 'merchant_id', length: 26 })
  merchantId!: string;

  @Column({ name: 'category_id', length: 26 })
  categoryId!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ unique: true, length: 220 })
  slug!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'compare_price' })
  comparePrice?: number;

  @Column({ default: 0 })
  stock!: number;

  @Column({ nullable: true, unique: true, length: 100 })
  sku?: string;

  @Column({ default: 10, name: 'low_stock_at' })
  lowStockAt!: number;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status!: ProductStatus;

  @Column({ type: 'jsonb', default: [] })
  images!: string[];

  @Column({ type: 'jsonb', default: [], nullable: true })
  variants?: ProductVariant[];

  @Column({ type: 'decimal', precision: 3, scale: 1, default: 0, name: 'avg_rating' })
  avgRating!: number;

  @Column({ default: 0, name: 'review_count' })
  reviewCount!: number;

  @Column({ default: 0, name: 'total_sold' })
  totalSold!: number;

  @Column({ default: false, name: 'is_featured' })
  isFeatured!: boolean;

  @Column({ default: 0, name: 'flag_count' })
  flagCount!: number;                  // number of times this product was flagged

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // ── Relations ──
  @ManyToOne(() => Merchant, (m) => m.products)
  @JoinColumn({ name: 'merchant_id' })
  merchant!: Merchant;

  @ManyToOne(() => Category, (c) => c.products)
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems!: OrderItem[];

  @OneToMany(() => Review, (review) => review.product)
  reviews!: Review[];

  @OneToMany(() => Wishlist, (wish) => wish.product)
  wishlistEntries!: Wishlist[];
}

export interface ProductVariant {
  type: 'color' | 'size' | 'material' | 'custom';
  label: string;
  values: VariantValue[];
}

export interface VariantValue {
  id: string;
  value: string;
  priceModifier?: number;
  stock?: number;
  sku?: string;
}
