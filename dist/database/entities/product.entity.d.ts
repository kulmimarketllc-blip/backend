import { BaseEntity } from './base.entity';
import { Merchant, Category, Wishlist } from './supporting.entities';
import { OrderItem } from './order.entity';
import { Review } from './review-coupon.entities';
export declare enum ProductStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    OUT_OF_STOCK = "out_of_stock",
    PENDING_REVIEW = "pending_review",
    REJECTED = "rejected"
}
export declare class Product extends BaseEntity {
    merchantId: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    comparePrice?: number;
    stock: number;
    sku?: string;
    lowStockAt: number;
    status: ProductStatus;
    images: string[];
    variants?: ProductVariant[];
    avgRating: number;
    reviewCount: number;
    totalSold: number;
    isFeatured: boolean;
    flagCount: number;
    metadata?: Record<string, any>;
    merchant: Merchant;
    category: Category;
    orderItems: OrderItem[];
    reviews: Review[];
    wishlistEntries: Wishlist[];
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
