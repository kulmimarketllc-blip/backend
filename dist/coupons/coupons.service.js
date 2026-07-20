"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CouponsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CouponsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ulid_1 = require("ulid");
const review_coupon_entities_1 = require("../database/entities/review-coupon.entities");
let CouponsService = CouponsService_1 = class CouponsService {
    constructor(couponsRepo, usagesRepo) {
        this.couponsRepo = couponsRepo;
        this.usagesRepo = usagesRepo;
        this.logger = new common_1.Logger(CouponsService_1.name);
    }
    async validate(dto, userId) {
        const coupon = await this.couponsRepo.findOne({
            where: { code: dto.code.toUpperCase(), isActive: true },
        });
        if (!coupon) {
            throw new common_1.NotFoundException(`Coupon code "${dto.code}" not found or expired`);
        }
        const now = new Date();
        if (coupon.startsAt && coupon.startsAt > now) {
            throw new common_1.BadRequestException('This coupon is not yet active');
        }
        if (coupon.expiresAt && coupon.expiresAt < now) {
            throw new common_1.BadRequestException('This coupon has expired');
        }
        if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
            throw new common_1.BadRequestException('This coupon has reached its usage limit');
        }
        if (coupon.minOrderValue && dto.cartTotal < coupon.minOrderValue) {
            throw new common_1.BadRequestException(`Minimum order value for this coupon is $${coupon.minOrderValue.toFixed(2)}`);
        }
        if (coupon.maxUsesPerUser) {
            const userUsages = await this.usagesRepo.count({
                where: { couponId: coupon.id, userId },
            });
            if (userUsages >= coupon.maxUsesPerUser) {
                throw new common_1.BadRequestException(`You have already used this coupon ${coupon.maxUsesPerUser} time(s)`);
            }
        }
        if (coupon.scope === review_coupon_entities_1.CouponScope.FIRST_ORDER) {
            const hasOrders = await this.usagesRepo.count({ where: { userId } });
            if (hasOrders > 0) {
                throw new common_1.BadRequestException('This coupon is only valid for first-time orders');
            }
        }
        const discountAmount = this.calculateDiscount(coupon, dto.cartTotal);
        return {
            valid: true,
            coupon,
            discountAmount,
            message: `Coupon applied! You save $${discountAmount.toFixed(2)}`,
        };
    }
    async apply(couponCode, userId, orderId, cartTotal) {
        const result = await this.validate({ code: couponCode, cartTotal }, userId);
        await this.couponsRepo.increment({ id: result.coupon.id }, 'usedCount', 1);
        await this.usagesRepo.save(this.usagesRepo.create({
            id: (0, ulid_1.ulid)(),
            couponId: result.coupon.id,
            userId,
            orderId,
            discountApplied: result.discountAmount,
        }));
        this.logger.log(`Coupon ${couponCode} applied to order ${orderId} — discount $${result.discountAmount}`);
        return result.discountAmount;
    }
    async create(dto, adminId) {
        const existing = await this.couponsRepo.findOne({
            where: { code: dto.code.toUpperCase() },
        });
        if (existing) {
            throw new common_1.ConflictException(`Coupon code "${dto.code}" already exists`);
        }
        const coupon = this.couponsRepo.create({
            ...dto,
            id: (0, ulid_1.ulid)(),
            code: dto.code.toUpperCase(),
            createdBy: adminId,
        });
        return this.couponsRepo.save(coupon);
    }
    async findAll(page = 1, limit = 20, active) {
        const where = {};
        if (active !== undefined)
            where.isActive = active;
        const [data, total] = await this.couponsRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async findOne(id) {
        const coupon = await this.couponsRepo.findOneBy({ id });
        if (!coupon)
            throw new common_1.NotFoundException(`Coupon ${id} not found`);
        return coupon;
    }
    async findByCode(code) {
        const coupon = await this.couponsRepo.findOne({
            where: { code: code.toUpperCase() },
        });
        if (!coupon)
            throw new common_1.NotFoundException(`Coupon "${code}" not found`);
        return coupon;
    }
    async update(id, dto) {
        const coupon = await this.findOne(id);
        if (dto.code)
            dto.code = dto.code.toUpperCase();
        Object.assign(coupon, dto);
        return this.couponsRepo.save(coupon);
    }
    async deactivate(id) {
        const coupon = await this.findOne(id);
        coupon.isActive = false;
        return this.couponsRepo.save(coupon);
    }
    async remove(id) {
        const coupon = await this.findOne(id);
        await this.couponsRepo.softDelete(id);
    }
    async getUsageStats(id) {
        const coupon = await this.findOne(id);
        const [usages, total] = await this.usagesRepo.findAndCount({
            where: { couponId: id },
            order: { usedAt: 'DESC' },
            take: 10,
        });
        const totalDiscount = usages.reduce((sum, u) => sum + Number(u.discountApplied), 0);
        return {
            coupon,
            stats: {
                totalUses: coupon.usedCount,
                remaining: coupon.maxUses ? coupon.maxUses - coupon.usedCount : null,
                totalDiscountGiven: +totalDiscount.toFixed(2),
                recentUsages: usages,
            },
        };
    }
    async getExpiringSoon(days = 7) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + days);
        return this.couponsRepo.find({
            where: {
                isActive: true,
                expiresAt: (0, typeorm_2.MoreThan)(new Date()),
            },
            order: { expiresAt: 'ASC' },
            take: 20,
        });
    }
    calculateDiscount(coupon, cartTotal) {
        let discount = 0;
        switch (coupon.type) {
            case review_coupon_entities_1.CouponType.PERCENTAGE:
                discount = (cartTotal * Number(coupon.value)) / 100;
                if (coupon.maxDiscount)
                    discount = Math.min(discount, Number(coupon.maxDiscount));
                break;
            case review_coupon_entities_1.CouponType.FLAT:
                discount = Math.min(Number(coupon.value), cartTotal);
                break;
            case review_coupon_entities_1.CouponType.FREE_SHIP:
                discount = 0;
                break;
        }
        return +discount.toFixed(2);
    }
};
exports.CouponsService = CouponsService;
exports.CouponsService = CouponsService = CouponsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(review_coupon_entities_1.Coupon)),
    __param(1, (0, typeorm_1.InjectRepository)(review_coupon_entities_1.CouponUsage)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CouponsService);
//# sourceMappingURL=coupons.service.js.map