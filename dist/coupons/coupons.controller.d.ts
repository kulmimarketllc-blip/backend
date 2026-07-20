import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/index';
import { User } from '../database/entities/user.entity';
export declare class CouponsController {
    private readonly couponsService;
    constructor(couponsService: CouponsService);
    validate(dto: ValidateCouponDto, user: User): Promise<import("./coupons.service").CouponValidationResult>;
    getExpiringSoon(days?: number): Promise<import("../database/entities/review-coupon.entities").Coupon[]>;
    findAll(page?: number, limit?: number, active?: string): Promise<{
        data: import("../database/entities/review-coupon.entities").Coupon[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<import("../database/entities/review-coupon.entities").Coupon>;
    findByCode(code: string): Promise<import("../database/entities/review-coupon.entities").Coupon>;
    getStats(id: string): Promise<{
        coupon: import("../database/entities/review-coupon.entities").Coupon;
        stats: {
            totalUses: number;
            remaining: number | null;
            totalDiscountGiven: number;
            recentUsages: import("../database/entities/review-coupon.entities").CouponUsage[];
        };
    }>;
    create(dto: CreateCouponDto, user: User): Promise<import("../database/entities/review-coupon.entities").Coupon>;
    update(id: string, dto: UpdateCouponDto): Promise<import("../database/entities/review-coupon.entities").Coupon>;
    deactivate(id: string): Promise<import("../database/entities/review-coupon.entities").Coupon>;
    remove(id: string): Promise<void>;
}
