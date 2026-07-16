import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { ulid } from 'ulid';

import {
  Coupon, CouponUsage, CouponType, CouponScope,
} from '../database/entities/review-coupon.entities';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

export interface CouponValidationResult {
  valid: boolean;
  coupon: Coupon;
  discountAmount: number;
  message: string;
}

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    @InjectRepository(Coupon)
    private readonly couponsRepo: Repository<Coupon>,

    @InjectRepository(CouponUsage)
    private readonly usagesRepo: Repository<CouponUsage>,
  ) {}

  // ── Validate & Calculate Discount ────────────
  async validate(
    dto: ValidateCouponDto,
    userId: string,
  ): Promise<CouponValidationResult> {
    const coupon = await this.couponsRepo.findOne({
      where: { code: dto.code.toUpperCase(), isActive: true },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon code "${dto.code}" not found or expired`);
    }

    // Check active window
    const now = new Date();
    if (coupon.startsAt && coupon.startsAt > now) {
      throw new BadRequestException('This coupon is not yet active');
    }
    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException('This coupon has expired');
    }

    // Check global usage limit
    if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    // Check minimum order value
    if (coupon.minOrderValue && dto.cartTotal < coupon.minOrderValue) {
      throw new BadRequestException(
        `Minimum order value for this coupon is $${coupon.minOrderValue.toFixed(2)}`,
      );
    }

    // Check per-user usage limit
    if (coupon.maxUsesPerUser) {
      const userUsages = await this.usagesRepo.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsages >= coupon.maxUsesPerUser) {
        throw new BadRequestException(
          `You have already used this coupon ${coupon.maxUsesPerUser} time(s)`,
        );
      }
    }

    // Check first-order scope
    if (coupon.scope === CouponScope.FIRST_ORDER) {
      const hasOrders = await this.usagesRepo.count({ where: { userId } });
      if (hasOrders > 0) {
        throw new BadRequestException('This coupon is only valid for first-time orders');
      }
    }

    // Calculate discount
    const discountAmount = this.calculateDiscount(coupon, dto.cartTotal);

    return {
      valid: true,
      coupon,
      discountAmount,
      message: `Coupon applied! You save $${discountAmount.toFixed(2)}`,
    };
  }

  // ── Apply Coupon (called when order is created) ──
  async apply(
    couponCode: string,
    userId: string,
    orderId: string,
    cartTotal: number,
  ): Promise<number> {
    const result = await this.validate({ code: couponCode, cartTotal }, userId);

    // Atomically increment usage count
    await this.couponsRepo.increment({ id: result.coupon.id }, 'usedCount', 1);

    // Record usage
    await this.usagesRepo.save(
      this.usagesRepo.create({
        id: ulid(),
        couponId: result.coupon.id,
        userId,
        orderId,
        discountApplied: result.discountAmount,
      }),
    );

    this.logger.log(
      `Coupon ${couponCode} applied to order ${orderId} — discount $${result.discountAmount}`,
    );
    return result.discountAmount;
  }

  // ── Admin CRUD ────────────────────────────────
  async create(dto: CreateCouponDto, adminId: string): Promise<Coupon> {
    const existing = await this.couponsRepo.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${dto.code}" already exists`);
    }

    const coupon = this.couponsRepo.create({
      ...dto,
      id: ulid(),
      code: dto.code.toUpperCase(),
      createdBy: adminId,
    });

    return this.couponsRepo.save(coupon);
  }

  async findAll(page = 1, limit = 20, active?: boolean) {
    const where: any = {};
    if (active !== undefined) where.isActive = active;

    const [data, total] = await this.couponsRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponsRepo.findOneBy({ id });
    if (!coupon) throw new NotFoundException(`Coupon ${id} not found`);
    return coupon;
  }

  async findByCode(code: string): Promise<Coupon> {
    const coupon = await this.couponsRepo.findOne({
      where: { code: code.toUpperCase() },
    });
    if (!coupon) throw new NotFoundException(`Coupon "${code}" not found`);
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);
    if (dto.code) dto.code = dto.code.toUpperCase();
    Object.assign(coupon, dto);
    return this.couponsRepo.save(coupon);
  }

  async deactivate(id: string): Promise<Coupon> {
    const coupon = await this.findOne(id);
    coupon.isActive = false;
    return this.couponsRepo.save(coupon);
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.findOne(id);
    await this.couponsRepo.softDelete(id);
  }

  // ── Usage Stats ───────────────────────────────
  async getUsageStats(id: string) {
    const coupon = await this.findOne(id);

    const [usages, total] = await this.usagesRepo.findAndCount({
      where: { couponId: id },
      order: { usedAt: 'DESC' },
      take: 10,
    });

    const totalDiscount = usages.reduce(
      (sum, u) => sum + Number(u.discountApplied), 0,
    );

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

  // ── Expiring Soon (for admin dashboard) ───────
  async getExpiringSoon(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    return this.couponsRepo.find({
      where: {
        isActive: true,
        expiresAt: MoreThan(new Date()),
      },
      order: { expiresAt: 'ASC' },
      take: 20,
    });
  }

  // ── Private: Calculate Discount ───────────────
  private calculateDiscount(coupon: Coupon, cartTotal: number): number {
    let discount = 0;

    switch (coupon.type) {
      case CouponType.PERCENTAGE:
        discount = (cartTotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
        break;

      case CouponType.FLAT:
        discount = Math.min(Number(coupon.value), cartTotal);
        break;

      case CouponType.FREE_SHIP:
        // Shipping discount handled at order level
        discount = 0;
        break;
    }

    return +discount.toFixed(2);
  }
}
