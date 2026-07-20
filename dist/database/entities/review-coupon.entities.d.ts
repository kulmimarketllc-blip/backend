import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Product } from './product.entity';
export declare enum ReviewStatus {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    FLAGGED = "flagged"
}
export declare class Review extends BaseEntity {
    productId: string;
    userId: string;
    orderId: string;
    rating: number;
    title?: string;
    comment?: string;
    images?: string[];
    isVerifiedPurchase: boolean;
    helpfulCount: number;
    flagCount: number;
    status: ReviewStatus;
    merchantReply?: string;
    merchantRepliedAt?: Date;
    merchantId?: string;
    product: Product;
    user: User;
}
export declare class ReviewHelpful {
    id: string;
    reviewId: string;
    userId: string;
    createdAt: Date;
}
export declare enum CouponType {
    PERCENTAGE = "percentage",
    FLAT = "flat",
    FREE_SHIP = "free_shipping"
}
export declare enum CouponScope {
    ALL = "all",
    CATEGORY = "category",
    MERCHANT = "merchant",
    PRODUCT = "product",
    FIRST_ORDER = "first_order"
}
export declare class Coupon extends BaseEntity {
    code: string;
    description?: string;
    type: CouponType;
    value: number;
    maxDiscount?: number;
    minOrderValue?: number;
    scope: CouponScope;
    scopeId?: string;
    maxUses?: number;
    usedCount: number;
    maxUsesPerUser?: number;
    isActive: boolean;
    startsAt?: Date;
    expiresAt?: Date;
    createdBy?: string;
}
export declare class CouponUsage {
    id: string;
    couponId: string;
    userId: string;
    orderId: string;
    discountApplied: number;
    usedAt: Date;
}
