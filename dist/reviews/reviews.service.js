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
var ReviewsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const ulid_1 = require("ulid");
const review_coupon_entities_1 = require("../database/entities/review-coupon.entities");
const product_entity_1 = require("../database/entities/product.entity");
const order_entity_1 = require("../database/entities/order.entity");
const user_entity_1 = require("../database/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../database/entities/notification.entity");
let ReviewsService = ReviewsService_1 = class ReviewsService {
    constructor(reviewsRepo, helpfulRepo, productsRepo, ordersRepo, dataSource, notifications) {
        this.reviewsRepo = reviewsRepo;
        this.helpfulRepo = helpfulRepo;
        this.productsRepo = productsRepo;
        this.ordersRepo = ordersRepo;
        this.dataSource = dataSource;
        this.notifications = notifications;
        this.logger = new common_1.Logger(ReviewsService_1.name);
    }
    async create(dto, user) {
        const order = await this.ordersRepo.findOne({
            where: { id: dto.orderId, customerId: user.id, status: order_entity_1.OrderStatus.DELIVERED },
            relations: ['items'],
        });
        if (!order) {
            throw new common_1.BadRequestException('You can only review products from your delivered orders');
        }
        const wasOrdered = order.items.some((i) => i.productId === dto.productId);
        if (!wasOrdered) {
            throw new common_1.BadRequestException('This product was not in the specified order');
        }
        const existing = await this.reviewsRepo.findOne({
            where: { productId: dto.productId, userId: user.id, orderId: dto.orderId },
        });
        if (existing) {
            throw new common_1.ConflictException('You have already reviewed this product for this order');
        }
        const item = order.items.find((i) => i.productId === dto.productId);
        const review = this.reviewsRepo.create({
            id: (0, ulid_1.ulid)(),
            productId: dto.productId,
            userId: user.id,
            orderId: dto.orderId,
            merchantId: item?.merchantId,
            rating: dto.rating,
            title: dto.title,
            comment: dto.comment,
            images: dto.images ?? [],
            isVerifiedPurchase: true,
            status: review_coupon_entities_1.ReviewStatus.APPROVED,
        });
        const saved = await this.reviewsRepo.save(review);
        await this.recalculateProductRating(dto.productId);
        if (item?.merchantId) {
            await this.notifications.createNotificationForMerchant(item.merchantId, 'New Product Review', `${user.firstName || 'A customer'} left a ${dto.rating}-star review on your product.`, notification_entity_1.NotificationType.REVIEW, '/merchant/reviews');
        }
        this.logger.log(`Review created: ${saved.id} for product ${dto.productId} by user ${user.id}`);
        return this.findOne(saved.id);
    }
    async findByProduct(productId, query) {
        const { page = 1, limit = 10, rating, sort = 'newest', verified } = query;
        const qb = this.reviewsRepo
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.user', 'u')
            .where('r.productId = :productId', { productId })
            .andWhere('r.status = :status', { status: review_coupon_entities_1.ReviewStatus.APPROVED })
            .andWhere('r.deleted_at IS NULL');
        if (rating)
            qb.andWhere('r.rating = :rating', { rating });
        if (verified)
            qb.andWhere('r.isVerifiedPurchase = true');
        const orderMap = {
            newest: { 'r.createdAt': 'DESC' },
            oldest: { 'r.createdAt': 'ASC' },
            highest: { 'r.rating': 'DESC' },
            lowest: { 'r.rating': 'ASC' },
            helpful: { 'r.helpfulCount': 'DESC' },
        };
        qb.orderBy(orderMap[sort] ?? { 'r.createdAt': 'DESC' });
        qb.skip((page - 1) * limit).take(Math.min(limit, 50));
        const [data, total] = await qb.getManyAndCount();
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
        const breakdown = await this.getRatingBreakdown(productId);
        return {
            data: scrubbed,
            breakdown,
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        };
    }
    async findByMerchant(merchantId, query) {
        const { page = 1, limit = 20, rating, sort = 'newest' } = query;
        const qb = this.reviewsRepo
            .createQueryBuilder('r')
            .leftJoinAndSelect('r.product', 'p')
            .leftJoinAndSelect('r.user', 'u')
            .where('r.merchant_id = :merchantId', { merchantId })
            .andWhere('r.deleted_at IS NULL');
        if (rating)
            qb.andWhere('r.rating = :rating', { rating });
        const orderMap = {
            newest: { 'r.createdAt': 'DESC' },
            highest: { 'r.rating': 'DESC' },
            lowest: { 'r.rating': 'ASC' },
        };
        qb.orderBy(orderMap[sort] ?? { 'r.createdAt': 'DESC' });
        qb.skip((page - 1) * limit).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async findOne(id) {
        const review = await this.reviewsRepo.findOne({
            where: { id },
            relations: ['user', 'product'],
        });
        if (!review)
            throw new common_1.NotFoundException(`Review ${id} not found`);
        return review;
    }
    async update(id, dto, user) {
        const review = await this.findOne(id);
        if (review.userId !== user.id)
            throw new common_1.ForbiddenException('Not your review');
        const age = Date.now() - new Date(review.createdAt).getTime();
        const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
        if (age > FORTY_EIGHT_HOURS) {
            throw new common_1.BadRequestException('Reviews can only be edited within 48 hours of posting');
        }
        Object.assign(review, dto);
        review.status = review_coupon_entities_1.ReviewStatus.APPROVED;
        const saved = await this.reviewsRepo.save(review);
        await this.recalculateProductRating(review.productId);
        return saved;
    }
    async remove(id, user) {
        const review = await this.findOne(id);
        const canDelete = review.userId === user.id ||
            user.role === user_entity_1.UserRole.ADMIN;
        if (!canDelete)
            throw new common_1.ForbiddenException();
        await this.reviewsRepo.softDelete(id);
        await this.recalculateProductRating(review.productId);
    }
    async addMerchantReply(id, dto, merchantId) {
        const review = await this.findOne(id);
        if (review.merchantId !== merchantId) {
            throw new common_1.ForbiddenException('This review is not for your store');
        }
        if (review.merchantReply) {
            throw new common_1.ConflictException('You have already replied to this review');
        }
        review.merchantReply = dto.reply;
        review.merchantRepliedAt = new Date();
        const saved = await this.reviewsRepo.save(review);
        await this.notifications.createNotification(review.userId, 'Merchant Replied to Your Review', 'A merchant replied to your product review.', notification_entity_1.NotificationType.REVIEW, `/product/${review.productId}`);
        return saved;
    }
    async updateMerchantReply(id, dto, merchantId) {
        const review = await this.findOne(id);
        if (review.merchantId !== merchantId)
            throw new common_1.ForbiddenException();
        if (!review.merchantReply)
            throw new common_1.BadRequestException('No reply exists to update');
        review.merchantReply = dto.reply;
        return this.reviewsRepo.save(review);
    }
    async markHelpful(reviewId, userId) {
        const review = await this.findOne(reviewId);
        if (review.userId === userId) {
            throw new common_1.BadRequestException('You cannot mark your own review as helpful');
        }
        const existing = await this.helpfulRepo.findOne({
            where: { reviewId, userId },
        });
        if (existing) {
            await this.helpfulRepo.delete({ reviewId, userId });
            await this.reviewsRepo.decrement({ id: reviewId }, 'helpfulCount', 1);
            const updated = await this.findOne(reviewId);
            return { helpfulCount: updated.helpfulCount };
        }
        await this.helpfulRepo.save(this.helpfulRepo.create({ id: (0, ulid_1.ulid)(), reviewId, userId }));
        await this.reviewsRepo.increment({ id: reviewId }, 'helpfulCount', 1);
        const updated = await this.findOne(reviewId);
        return { helpfulCount: updated.helpfulCount };
    }
    async moderate(id, status, adminId) {
        const review = await this.findOne(id);
        review.status = status;
        const saved = await this.reviewsRepo.save(review);
        if (status === review_coupon_entities_1.ReviewStatus.REJECTED) {
            await this.recalculateProductRating(review.productId);
        }
        this.logger.log(`Review ${id} moderated to "${status}" by admin ${adminId}`);
        return saved;
    }
    async flag(id) {
        const review = await this.reviewsRepo.findOneBy({ id });
        if (!review)
            throw new common_1.NotFoundException('Review not found');
        await this.reviewsRepo.increment({ id }, 'flagCount', 1);
        await this.notifications.notifySubAdmins('🚩 Review Flagged', `A review for product ID "${review.productId}" has been flagged.`, notification_entity_1.NotificationType.SYSTEM, `/subadmin/review-moderation`);
        console.log(`[ReviewsService] Flagged review ${id}. New count should be incremented.`);
        return { success: true };
    }
    async getRatingBreakdown(productId) {
        const result = await this.reviewsRepo
            .createQueryBuilder('r')
            .select('r.rating', 'rating')
            .addSelect('COUNT(*)', 'count')
            .where('r.productId = :productId', { productId })
            .andWhere('r.status = :status', { status: review_coupon_entities_1.ReviewStatus.APPROVED })
            .andWhere('r.deleted_at IS NULL')
            .groupBy('r.rating')
            .orderBy('r.rating', 'DESC')
            .getRawMany();
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let total = 0;
        for (const row of result) {
            breakdown[row.rating] = parseInt(row.count, 10);
            total += breakdown[row.rating];
        }
        const avg = total > 0
            ? Object.entries(breakdown).reduce((sum, [star, count]) => sum + parseInt(star) * count, 0) / total
            : 0;
        return {
            average: +avg.toFixed(1),
            total,
            breakdown,
            percentages: Object.fromEntries(Object.entries(breakdown).map(([star, count]) => [
                star, total > 0 ? +((count / total) * 100).toFixed(1) : 0,
            ])),
        };
    }
    async recalculateProductRating(productId) {
        const result = await this.reviewsRepo
            .createQueryBuilder('r')
            .select('AVG(r.rating)', 'avg')
            .addSelect('COUNT(*)', 'count')
            .where('r.productId = :productId', { productId })
            .andWhere('r.status = :status', { status: review_coupon_entities_1.ReviewStatus.APPROVED })
            .andWhere('r.deleted_at IS NULL')
            .getRawOne();
        const avgRating = result?.avg ? +parseFloat(result.avg).toFixed(1) : 0;
        const reviewCount = parseInt(result?.count ?? '0', 10);
        await this.productsRepo.update(productId, { avgRating, reviewCount });
    }
};
exports.ReviewsService = ReviewsService;
exports.ReviewsService = ReviewsService = ReviewsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(review_coupon_entities_1.Review)),
    __param(1, (0, typeorm_1.InjectRepository)(review_coupon_entities_1.ReviewHelpful)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(3, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService])
], ReviewsService);
//# sourceMappingURL=reviews.service.js.map