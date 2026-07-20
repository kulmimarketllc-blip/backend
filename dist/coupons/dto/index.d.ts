import { CouponType, CouponScope } from '../../database/entities/review-coupon.entities';
export declare class CreateCouponDto {
    code: string;
    description?: string;
    type: CouponType;
    value: number;
    maxDiscount?: number;
    minOrderValue?: number;
    scope: CouponScope;
    scopeId?: string;
    maxUses?: number;
    maxUsesPerUser?: number;
    startsAt?: Date;
    expiresAt?: Date;
}
export declare class UpdateCouponDto {
    code?: string;
    description?: string;
    type?: CouponType;
    value?: number;
    maxDiscount?: number;
    minOrderValue?: number;
    scope?: CouponScope;
    scopeId?: string;
    maxUses?: number;
    maxUsesPerUser?: number;
    isActive?: boolean;
    startsAt?: Date;
    expiresAt?: Date;
}
export declare class ValidateCouponDto {
    code: string;
    cartTotal: number;
}
