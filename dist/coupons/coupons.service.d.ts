import { Repository } from 'typeorm';
import { Coupon, CouponUsage } from '../database/entities/review-coupon.entities';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
export interface CouponValidationResult {
    valid: boolean;
    coupon: Coupon;
    discountAmount: number;
    message: string;
}
export declare class CouponsService {
    private readonly couponsRepo;
    private readonly usagesRepo;
    private readonly logger;
    constructor(couponsRepo: Repository<Coupon>, usagesRepo: Repository<CouponUsage>);
    validate(dto: ValidateCouponDto, userId: string): Promise<CouponValidationResult>;
    apply(couponCode: string, userId: string, orderId: string, cartTotal: number): Promise<number>;
    create(dto: CreateCouponDto, adminId: string): Promise<Coupon>;
    findAll(page?: number, limit?: number, active?: boolean): Promise<{
        data: Coupon[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<Coupon>;
    findByCode(code: string): Promise<Coupon>;
    update(id: string, dto: UpdateCouponDto): Promise<Coupon>;
    deactivate(id: string): Promise<Coupon>;
    remove(id: string): Promise<void>;
    getUsageStats(id: string): Promise<{
        coupon: Coupon;
        stats: {
            totalUses: number;
            remaining: number | null;
            totalDiscountGiven: number;
            recentUsages: CouponUsage[];
        };
    }>;
    getExpiringSoon(days?: number): Promise<Coupon[]>;
    private calculateDiscount;
}
