import {
  Injectable, NotFoundException, BadRequestException,
  ForbiddenException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ulid } from 'ulid';

import { Review, ReviewHelpful, ReviewStatus } from '../database/entities/review-coupon.entities';
import { Product } from '../database/entities/product.entity';
import { Order, OrderStatus } from '../database/entities/order.entity';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { MerchantReplyDto } from './dto/merchant-reply.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewsRepo: Repository<Review>,

    @InjectRepository(ReviewHelpful)
    private readonly helpfulRepo: Repository<ReviewHelpful>,

    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,

    @InjectRepository(Order)
    private readonly ordersRepo: Repository<Order>,

    private readonly dataSource: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Create Review ─────────────────────────────
  async create(dto: CreateReviewDto, user: User): Promise<Review> {
    // 1. Verify the order exists, belongs to this user, and is delivered
    const order = await this.ordersRepo.findOne({
      where: { id: dto.orderId, customerId: user.id, status: OrderStatus.DELIVERED },
      relations: ['items'],
    });
    if (!order) {
      throw new BadRequestException(
        'You can only review products from your delivered orders',
      );
    }

    // 2. Verify the product was in that order
    const wasOrdered = order.items.some((i) => i.productId === dto.productId);
    if (!wasOrdered) {
      throw new BadRequestException('This product was not in the specified order');
    }

    // 3. Prevent duplicate review (one review per product per order)
    const existing = await this.reviewsRepo.findOne({
      where: { productId: dto.productId, userId: user.id, orderId: dto.orderId },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product for this order');
    }

    // 4. Get merchantId from the order item
    const item = order.items.find((i) => i.productId === dto.productId);

    const review = this.reviewsRepo.create({
      id: ulid(),
      productId: dto.productId,
      userId: user.id,
      orderId: dto.orderId,
      merchantId: item?.merchantId,
      rating: dto.rating,
      title: dto.title,
      comment: dto.comment,
      images: dto.images ?? [],
      isVerifiedPurchase: true,
      status: ReviewStatus.APPROVED,
    });

    const saved = await this.reviewsRepo.save(review);

    // 5. Recalculate product rating aggregate
    await this.recalculateProductRating(dto.productId);

    if (item?.merchantId) {
      await this.notifications.createNotificationForMerchant(
        item.merchantId,
        'New Product Review',
        `${user.firstName || 'A customer'} left a ${dto.rating}-star review on your product.`,
        NotificationType.REVIEW,
        '/merchant/reviews',
      );
    }

    this.logger.log(`Review created: ${saved.id} for product ${dto.productId} by user ${user.id}`);
    return this.findOne(saved.id);
  }

  // ── List Reviews for a Product ────────────────
  async findByProduct(productId: string, query: ReviewQueryDto) {
    const { page = 1, limit = 10, rating, sort = 'newest', verified } = query;

    const qb = this.reviewsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.productId = :productId', { productId })
      .andWhere('r.status = :status', { status: ReviewStatus.APPROVED })
      .andWhere('r.deleted_at IS NULL');

    if (rating)   qb.andWhere('r.rating = :rating', { rating });
    if (verified) qb.andWhere('r.isVerifiedPurchase = true');

    const orderMap: Record<string, Record<string, 'ASC' | 'DESC'>> = {
      newest:    { 'r.createdAt': 'DESC' },
      oldest:    { 'r.createdAt': 'ASC' },
      highest:   { 'r.rating': 'DESC' },
      lowest:    { 'r.rating': 'ASC' },
      helpful:   { 'r.helpfulCount': 'DESC' },
    };
    qb.orderBy(orderMap[sort] ?? { 'r.createdAt': 'DESC' });

    qb.skip((page - 1) * limit).take(Math.min(limit, 50));

    const [data, total] = await qb.getManyAndCount();

    // Scrub personal info from user
    const scrubbed = data.map((r) => ({
      ...r,
      user: r.user
        ? {
            id: r.user.id,
            firstName: r.user.firstName,
            lastName: r.user.lastName,
            avatarUrl: r.user.avatarUrl,
          }
        : null,
    }));

    // Rating breakdown
    const breakdown = await this.getRatingBreakdown(productId);

    return {
      data: scrubbed,
      breakdown,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // ── List Reviews by Merchant ──────────────────
  async findByMerchant(merchantId: string, query: ReviewQueryDto) {
    const { page = 1, limit = 20, rating, sort = 'newest' } = query;

    const qb = this.reviewsRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.product', 'p')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.merchant_id = :merchantId', { merchantId })
      .andWhere('r.deleted_at IS NULL');

    if (rating) qb.andWhere('r.rating = :rating', { rating });

    const orderMap: Record<string, Record<string, 'ASC' | 'DESC'>> = {
      newest:  { 'r.createdAt': 'DESC' },
      highest: { 'r.rating': 'DESC' },
      lowest:  { 'r.rating': 'ASC' },
    };
    qb.orderBy(orderMap[sort] ?? { 'r.createdAt': 'DESC' });
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  // ── Get Single Review ─────────────────────────
  async findOne(id: string): Promise<Review> {
    const review = await this.reviewsRepo.findOne({
      where: { id },
      relations: ['user', 'product'],
    });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    return review;
  }

  // ── Update Review (owner only, within 48h) ────
  async update(id: string, dto: UpdateReviewDto, user: User): Promise<Review> {
    const review = await this.findOne(id);
    if (review.userId !== user.id) throw new ForbiddenException('Not your review');

    const age = Date.now() - new Date(review.createdAt).getTime();
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    if (age > FORTY_EIGHT_HOURS) {
      throw new BadRequestException('Reviews can only be edited within 48 hours of posting');
    }

    Object.assign(review, dto);
    review.status = ReviewStatus.APPROVED; // re-approve on edit

    const saved = await this.reviewsRepo.save(review);
    await this.recalculateProductRating(review.productId);
    return saved;
  }

  // ── Delete Review ─────────────────────────────
  async remove(id: string, user: User): Promise<void> {
    const review = await this.findOne(id);

    const canDelete =
      review.userId === user.id ||
      user.role === UserRole.ADMIN;

    if (!canDelete) throw new ForbiddenException();

    await this.reviewsRepo.softDelete(id);
    await this.recalculateProductRating(review.productId);
  }

  // ── Merchant Reply ────────────────────────────
  async addMerchantReply(id: string, dto: MerchantReplyDto, merchantId: string): Promise<Review> {
    const review = await this.findOne(id);

    if (review.merchantId !== merchantId) {
      throw new ForbiddenException('This review is not for your store');
    }
    if (review.merchantReply) {
      throw new ConflictException('You have already replied to this review');
    }

    review.merchantReply = dto.reply;
    review.merchantRepliedAt = new Date();
    const saved = await this.reviewsRepo.save(review);

    await this.notifications.createNotification(
      review.userId,
      'Merchant Replied to Your Review',
      'A merchant replied to your product review.',
      NotificationType.REVIEW,
      `/product/${review.productId}`,
    );

    return saved;
  }

  // ── Update Merchant Reply ─────────────────────
  async updateMerchantReply(id: string, dto: MerchantReplyDto, merchantId: string): Promise<Review> {
    const review = await this.findOne(id);
    if (review.merchantId !== merchantId) throw new ForbiddenException();
    if (!review.merchantReply) throw new BadRequestException('No reply exists to update');
    review.merchantReply = dto.reply;
    return this.reviewsRepo.save(review);
  }

  // ── Mark as Helpful ───────────────────────────
  async markHelpful(reviewId: string, userId: string): Promise<{ helpfulCount: number }> {
    const review = await this.findOne(reviewId);

    if (review.userId === userId) {
      throw new BadRequestException('You cannot mark your own review as helpful');
    }

    const existing = await this.helpfulRepo.findOne({
      where: { reviewId, userId },
    });

    if (existing) {
      // Toggle off
      await this.helpfulRepo.delete({ reviewId, userId });
      await this.reviewsRepo.decrement({ id: reviewId }, 'helpfulCount', 1);
      const updated = await this.findOne(reviewId);
      return { helpfulCount: updated.helpfulCount };
    }

    await this.helpfulRepo.save(
      this.helpfulRepo.create({ id: ulid(), reviewId, userId }),
    );
    await this.reviewsRepo.increment({ id: reviewId }, 'helpfulCount', 1);

    const updated = await this.findOne(reviewId);
    return { helpfulCount: updated.helpfulCount };
  }

  // ── Admin: Moderate Review ────────────────────
  async moderate(id: string, status: ReviewStatus, adminId: string): Promise<Review> {
    const review = await this.findOne(id);
    review.status = status;
    const saved = await this.reviewsRepo.save(review);

    // If flagged review gets rejected, recalculate rating
    if (status === ReviewStatus.REJECTED) {
      await this.recalculateProductRating(review.productId);
    }

    this.logger.log(`Review ${id} moderated to "${status}" by admin ${adminId}`);
    return saved;
  }

  async flag(id: string) {
    const review = await this.reviewsRepo.findOneBy({ id });
    if (!review) throw new NotFoundException('Review not found');

    await this.reviewsRepo.increment({ id }, 'flagCount', 1);

    // Notify subadmins
    await this.notifications.notifySubAdmins(
      '🚩 Review Flagged',
      `A review for product ID "${review.productId}" has been flagged.`,
      NotificationType.SYSTEM,
      `/subadmin/review-moderation`
    );

    console.log(`[ReviewsService] Flagged review ${id}. New count should be incremented.`);
    return { success: true };
  }

  // ── Rating Breakdown ──────────────────────────
  async getRatingBreakdown(productId: string) {
    const result = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId', { productId })
      .andWhere('r.status = :status', { status: ReviewStatus.APPROVED })
      .andWhere('r.deleted_at IS NULL')
      .groupBy('r.rating')
      .orderBy('r.rating', 'DESC')
      .getRawMany();

    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let total = 0;

    for (const row of result) {
      breakdown[row.rating] = parseInt(row.count, 10);
      total += breakdown[row.rating];
    }

    const avg = total > 0
      ? Object.entries(breakdown).reduce(
          (sum, [star, count]) => sum + parseInt(star) * count, 0,
        ) / total
      : 0;

    return {
      average: +avg.toFixed(1),
      total,
      breakdown,
      percentages: Object.fromEntries(
        Object.entries(breakdown).map(([star, count]) => [
          star, total > 0 ? +((count / total) * 100).toFixed(1) : 0,
        ]),
      ),
    };
  }

  // ── Private: Recalculate Product Rating ───────
  private async recalculateProductRating(productId: string): Promise<void> {
    const result = await this.reviewsRepo
      .createQueryBuilder('r')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r.productId = :productId', { productId })
      .andWhere('r.status = :status', { status: ReviewStatus.APPROVED })
      .andWhere('r.deleted_at IS NULL')
      .getRawOne();

    const avgRating = result?.avg ? +parseFloat(result.avg).toFixed(1) : 0;
    const reviewCount = parseInt(result?.count ?? '0', 10);

    await this.productsRepo.update(productId, { avgRating, reviewCount });
  }
}
