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
var SubAdminService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubAdminService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const user_entity_1 = require("../database/entities/user.entity");
const review_coupon_entities_1 = require("../database/entities/review-coupon.entities");
const product_entity_1 = require("../database/entities/product.entity");
const merchants_service_1 = require("../merchants/merchants.service");
const sub_admin_features_entity_1 = require("../database/entities/sub-admin-features.entity");
const review_moderation_dto_1 = require("./dto/review-moderation.dto");
const content_moderation_dto_1 = require("./dto/content-moderation.dto");
const user_moderation_dto_1 = require("./dto/user-moderation.dto");
const sub_admin_features_entity_2 = require("../database/entities/sub-admin-features.entity");
const orders_service_1 = require("../orders/orders.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notification_entity_1 = require("../database/entities/notification.entity");
let SubAdminService = SubAdminService_1 = class SubAdminService {
    constructor(merchantRepo, userRepo, reviewRepo, productRepo, disputeRepo, activityLogRepo, permissionRepo, reportRepo, merchantsService, ordersService, notifications) {
        this.merchantRepo = merchantRepo;
        this.userRepo = userRepo;
        this.reviewRepo = reviewRepo;
        this.productRepo = productRepo;
        this.disputeRepo = disputeRepo;
        this.activityLogRepo = activityLogRepo;
        this.permissionRepo = permissionRepo;
        this.reportRepo = reportRepo;
        this.merchantsService = merchantsService;
        this.ordersService = ordersService;
        this.notifications = notifications;
        this.logger = new common_1.Logger(SubAdminService_1.name);
    }
    async listPendingMerchants(query, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canApproveMerchants'))) {
            throw new common_1.ForbiddenException('You do not have permission to view pending merchants');
        }
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder || 'DESC';
        const qb = this.merchantRepo.createQueryBuilder('m')
            .leftJoinAndSelect('m.user', 'u')
            .where('m.status = :status', { status: supporting_entities_1.MerchantStatus.PENDING });
        if (query.search) {
            qb.andWhere('(m.storeName ILIKE :search OR u.email ILIKE :search OR m.id = :search)', { search: `%${query.search}%` });
        }
        qb.orderBy(`m.${sortBy}`, sortOrder)
            .skip(skip)
            .take(limit);
        const [data, total] = await qb.getManyAndCount();
        return {
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async getPendingMerchantsCount(requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Only sub-admins can view pending merchants');
        }
        return this.merchantRepo.countBy({ status: supporting_entities_1.MerchantStatus.PENDING });
    }
    async approveMerchant(merchantId, dto, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canApproveMerchants'))) {
            throw new common_1.ForbiddenException('You do not have permission to approve merchants');
        }
        const merchant = await this.merchantRepo.findOne({
            where: { id: merchantId },
            relations: ['user'],
        });
        if (!merchant) {
            throw new common_1.NotFoundException(`Merchant ${merchantId} not found`);
        }
        if (merchant.status !== supporting_entities_1.MerchantStatus.PENDING) {
            throw new common_1.BadRequestException(`Cannot approve merchant with status "${merchant.status}". Only pending merchants can be approved.`);
        }
        if (dto.commissionRate < 0.5 || dto.commissionRate > 50) {
            throw new common_1.BadRequestException('Commission rate must be between 0.5% and 50%');
        }
        await this.merchantRepo.update(merchantId, {
            status: supporting_entities_1.MerchantStatus.APPROVED,
            commissionRate: dto.commissionRate,
        });
        await this.userRepo.update(merchant.userId, {
            role: user_entity_1.UserRole.MERCHANT,
        });
        const updated = await this.merchantRepo.findOne({
            where: { id: merchantId },
            relations: ['user'],
        });
        this.logger.log(`Merchant approved: ${merchantId} (${merchant.storeName}) by ${requester.id} with commission ${dto.commissionRate}%`);
        await this.logActivity(requester.id, 'approve_merchant', 'merchant', merchantId, { storeName: merchant.storeName, commissionRate: dto.commissionRate });
        await this.notifications.createNotification(merchant.userId, '🎉 Store Approved', `Congratulations! Your store "${merchant.storeName}" has been approved. You can now start listing products.`, notification_entity_1.NotificationType.SYSTEM, '/merchant/dashboard');
        return updated;
    }
    async rejectMerchant(merchantId, dto, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canApproveMerchants'))) {
            throw new common_1.ForbiddenException('You do not have permission to reject merchants');
        }
        const merchant = await this.merchantRepo.findOne({
            where: { id: merchantId },
            relations: ['user'],
        });
        if (!merchant) {
            throw new common_1.NotFoundException(`Merchant ${merchantId} not found`);
        }
        if (merchant.status !== supporting_entities_1.MerchantStatus.PENDING) {
            throw new common_1.BadRequestException(`Cannot reject merchant with status "${merchant.status}". Only pending merchants can be rejected.`);
        }
        if (!dto.reason || dto.reason.trim().length < 10) {
            throw new common_1.BadRequestException('Rejection reason must be at least 10 characters long.');
        }
        await this.merchantRepo.update(merchantId, {
            status: supporting_entities_1.MerchantStatus.REJECTED,
            businessInfo: {
                ...merchant.businessInfo,
                rejectionReason: dto.reason,
                rejectedAt: new Date().toISOString(),
                rejectedBy: requester.id,
            },
        });
        const updated = await this.merchantRepo.findOne({
            where: { id: merchantId },
            relations: ['user'],
        });
        this.logger.log(`Merchant rejected: ${merchantId} (${merchant.storeName}) by ${requester.id} — Reason: ${dto.reason}`);
        await this.logActivity(requester.id, 'reject_merchant', 'merchant', merchantId, { storeName: merchant.storeName, reason: dto.reason });
        await this.notifications.createNotification(merchant.userId, '❌ Store Application Rejected', `We regret to inform you that your store application for "${merchant.storeName}" was rejected. Reason: ${dto.reason}`, notification_entity_1.NotificationType.SYSTEM);
        return updated;
    }
    async getMerchantForModeration(merchantId, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Only sub-admins can view merchant details');
        }
        const merchant = await this.merchantRepo.findOne({
            where: { id: merchantId },
            relations: ['user'],
        });
        if (!merchant) {
            throw new common_1.NotFoundException(`Merchant ${merchantId} not found`);
        }
        return merchant;
    }
    async listFlaggedReviews(query, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canModerateReviews'))) {
            throw new common_1.ForbiddenException('You do not have permission to view flagged reviews');
        }
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const sortOrder = (query.sortOrder || 'DESC');
        const sortColumnMap = {
            flagCount: 'r.flagCount',
            createdAt: 'r.createdAt',
            rating: 'r.rating',
        };
        const sortCol = sortColumnMap[query.sortBy ?? 'flagCount'] ?? 'r.flagCount';
        const qb = this.reviewRepo.createQueryBuilder('r')
            .leftJoinAndSelect('r.product', 'p')
            .leftJoinAndSelect('r.user', 'u')
            .where('r.flagCount > :zero', { zero: 0 });
        if (query.minFlags) {
            qb.andWhere('r.flagCount >= :minFlags', { minFlags: query.minFlags });
        }
        if (query.search) {
            qb.andWhere('(r.id = :search OR p.id = :search OR p.name ILIKE :searchText)', { search: query.search, searchText: `%${query.search}%` });
        }
        qb.orderBy(sortCol, sortOrder)
            .skip(skip)
            .take(limit);
        const [data, total] = await qb.getManyAndCount();
        console.log('[SubAdminService] listFlaggedReviews count:', total);
        return {
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async getFlaggedReviewsCount(requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Only sub-admins can view flagged reviews');
        }
        const count = await this.reviewRepo.count({ where: { flagCount: (0, typeorm_2.MoreThanOrEqual)(1) } });
        console.log('[SubAdminService] getFlaggedReviewsCount:', count);
        return count;
    }
    async moderateReview(reviewId, dto, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canModerateReviews'))) {
            throw new common_1.ForbiddenException('You do not have permission to moderate reviews');
        }
        const review = await this.reviewRepo.findOne({
            where: { id: reviewId },
            relations: ['product', 'user'],
        });
        if (!review) {
            throw new common_1.NotFoundException(`Review ${reviewId} not found`);
        }
        let newStatus = review.status;
        const updates = {};
        switch (dto.action) {
            case review_moderation_dto_1.ReviewModerationAction.APPROVE:
                newStatus = review_coupon_entities_1.ReviewStatus.APPROVED;
                break;
            case review_moderation_dto_1.ReviewModerationAction.REJECT:
                newStatus = review_coupon_entities_1.ReviewStatus.REJECTED;
                break;
            case review_moderation_dto_1.ReviewModerationAction.REMOVE:
                newStatus = review_coupon_entities_1.ReviewStatus.REJECTED;
                break;
            case review_moderation_dto_1.ReviewModerationAction.CLEAR_FLAGS:
                updates.flagCount = 0;
                break;
        }
        if (dto.action !== review_moderation_dto_1.ReviewModerationAction.CLEAR_FLAGS) {
            updates.status = newStatus;
            updates.flagCount = 0;
        }
        await this.reviewRepo.update(reviewId, updates);
        const updated = await this.reviewRepo.findOne({ where: { id: reviewId } });
        this.logger.log(`Review moderated: ${reviewId} by ${requester.id} — Action: ${dto.action} — Reason: ${dto.reason}`);
        await this.logActivity(requester.id, 'moderate_review', 'review', reviewId, { action: dto.action, reason: dto.reason });
        if (dto.action === review_moderation_dto_1.ReviewModerationAction.REJECT || dto.action === review_moderation_dto_1.ReviewModerationAction.REMOVE) {
            await this.notifications.createNotification(review.userId, '⚠️ Review Moderated', `Your review for "${review.product?.name || 'a product'}" has been removed as it violates our community guidelines. Reason: ${dto.reason}`, notification_entity_1.NotificationType.SYSTEM);
        }
        return updated;
    }
    async listFlaggedContent(query, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canViewDashboard'))) {
            throw new common_1.ForbiddenException('You do not have permission to view flagged content');
        }
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const sortOrder = (query.sortOrder || 'DESC');
        const sortColumnMap = {
            flagCount: 'p.flagCount',
            createdAt: 'p.createdAt',
            name: 'p.name',
        };
        const sortCol = sortColumnMap[query.sortBy ?? 'flagCount'] ?? 'p.flagCount';
        const qb = this.productRepo.createQueryBuilder('p')
            .leftJoinAndSelect('p.merchant', 'm')
            .leftJoinAndSelect('p.category', 'c')
            .where('p.flagCount > :zero', { zero: 0 });
        if (query.minFlags) {
            qb.andWhere('p.flagCount >= :minFlags', { minFlags: query.minFlags });
        }
        if (query.search) {
            qb.andWhere('(p.id = :search OR p.name ILIKE :searchText OR p.slug ILIKE :searchText)', { search: query.search, searchText: `%${query.search}%` });
        }
        qb.orderBy(sortCol, sortOrder)
            .skip(skip)
            .take(limit);
        const [data, total] = await qb.getManyAndCount();
        console.log('[SubAdminService] listFlaggedContent count:', total);
        return {
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async getFlaggedContentCount(requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Only sub-admins can view flagged content');
        }
        const count = await this.productRepo.count({ where: { flagCount: (0, typeorm_2.MoreThanOrEqual)(1) } });
        console.log('[SubAdminService] getFlaggedContentCount:', count);
        return count;
    }
    async moderateContent(productId, dto, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canManageUsers'))) {
            throw new common_1.ForbiddenException('You do not have permission to moderate content');
        }
        const product = await this.productRepo.findOne({
            where: { id: productId },
            relations: ['merchant'],
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product ${productId} not found`);
        }
        let newStatus = product.status;
        const updates = {};
        switch (dto.action) {
            case content_moderation_dto_1.ContentModerationAction.APPROVE:
                newStatus = product_entity_1.ProductStatus.ACTIVE;
                updates.flagCount = 0;
                break;
            case content_moderation_dto_1.ContentModerationAction.REJECT:
                newStatus = product_entity_1.ProductStatus.REJECTED;
                updates.flagCount = 0;
                break;
            case content_moderation_dto_1.ContentModerationAction.REMOVE:
                newStatus = product_entity_1.ProductStatus.INACTIVE;
                updates.flagCount = 0;
                break;
            case content_moderation_dto_1.ContentModerationAction.SUSPEND_MERCHANT:
                await this.merchantRepo.update(product.merchantId, {
                    status: supporting_entities_1.MerchantStatus.SUSPENDED,
                });
                newStatus = product_entity_1.ProductStatus.INACTIVE;
                updates.flagCount = 0;
                this.logger.warn(`Merchant suspended: ${product.merchantId} due to content violation in product ${productId}`);
                break;
            case content_moderation_dto_1.ContentModerationAction.CLEAR_FLAGS:
                updates.flagCount = 0;
                break;
        }
        if (dto.action !== content_moderation_dto_1.ContentModerationAction.CLEAR_FLAGS) {
            updates.status = newStatus;
        }
        await this.productRepo.update(productId, updates);
        await this.logActivity(requester.id, 'moderate_content', 'product', productId, { action: dto.action, reason: dto.reason });
        const merchant = await this.merchantRepo.findOneBy({ id: product.merchantId });
        if (merchant) {
            let title = '⚠️ Product Moderated';
            let message = `Your product "${product.name}" has been moderated. Action: ${dto.action}. Reason: ${dto.reason}`;
            if (dto.action === content_moderation_dto_1.ContentModerationAction.SUSPEND_MERCHANT) {
                title = '🚫 Account Suspended';
                message = `Your merchant account has been suspended due to content violations in product "${product.name}". Reason: ${dto.reason}`;
            }
            await this.notifications.createNotification(merchant.userId, title, message, notification_entity_1.NotificationType.SYSTEM);
        }
        const updated = await this.productRepo.findOne({ where: { id: productId } });
        this.logger.log(`Content moderated: ${productId} by ${requester.id} — Action: ${dto.action} — Reason: ${dto.reason}`);
        return updated;
    }
    async moderateUser(userId, dto, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canManageUsers'))) {
            throw new common_1.ForbiddenException('You do not have permission to moderate users');
        }
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user)
            throw new common_1.NotFoundException(`User ${userId} not found`);
        const updates = {};
        const logDetails = { action: dto.action, reason: dto.reason };
        switch (dto.action) {
            case user_moderation_dto_1.UserModerationAction.WARN:
                updates.warningCount = (user.warningCount || 0) + 1;
                break;
            case user_moderation_dto_1.UserModerationAction.SUSPEND:
                updates.isSuspended = true;
                updates.suspensionReason = dto.reason;
                updates.isActive = false;
                break;
            case user_moderation_dto_1.UserModerationAction.RESTORE:
                updates.isSuspended = false;
                updates.isActive = true;
                break;
        }
        if (dto.notes) {
            updates.moderationNotes = user.moderationNotes
                ? `${user.moderationNotes}\n[${new Date().toISOString()}] ${dto.notes}`
                : `[${new Date().toISOString()}] ${dto.notes}`;
        }
        await this.userRepo.update(userId, updates);
        await this.logActivity(requester.id, 'moderate_user', 'user', userId, { action: dto.action, reason: dto.reason });
        let title = '⚠️ Account Warning';
        let message = `You have received a warning on your account. Reason: ${dto.reason}`;
        if (dto.action === user_moderation_dto_1.UserModerationAction.SUSPEND) {
            title = '🚫 Account Suspended';
            message = `Your account has been suspended. Reason: ${dto.reason}`;
        }
        else if (dto.action === user_moderation_dto_1.UserModerationAction.RESTORE) {
            title = '✅ Account Restored';
            message = 'Your account has been restored. You can now log in and use our services.';
        }
        await this.notifications.createNotification(userId, title, message, notification_entity_1.NotificationType.SYSTEM);
        const updatedUser = await this.userRepo.findOneBy({ id: userId });
        return updatedUser;
    }
    async listUsers(query, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (!(await this.checkPermission(requester.id, 'canManageUsers'))) {
            throw new common_1.ForbiddenException('You do not have permission to list users');
        }
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;
        const qb = this.userRepo.createQueryBuilder('u')
            .where('u.deleted_at IS NULL');
        if (query.role) {
            qb.andWhere('u.role = :role', { role: query.role });
        }
        else {
            qb.andWhere('u.role NOT IN (:...adminRoles)', {
                adminRoles: [user_entity_1.UserRole.ADMIN]
            });
        }
        if (query.status) {
            if (query.status === 'active')
                qb.andWhere('u.is_active = true AND u.is_suspended = false');
            if (query.status === 'inactive')
                qb.andWhere('u.is_active = false');
            if (query.status === 'suspended')
                qb.andWhere('u.is_suspended = true');
        }
        if (query.search) {
            qb.andWhere('(u.firstName ILIKE :search OR u.lastName ILIKE :search OR u.email ILIKE :search OR u.phone ILIKE :search)', { search: `%${query.search}%` });
        }
        qb.orderBy(`u.${query.sortBy || 'createdAt'}`, query.sortOrder || 'DESC')
            .skip(skip)
            .take(limit);
        const [data, total] = await qb.getManyAndCount();
        return {
            data,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };
    }
    async listDisputes(page = 1, limit = 20, status, requester) {
        if (requester && ![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        if (requester && !(await this.checkPermission(requester.id, 'canManageDisputes'))) {
            throw new common_1.ForbiddenException('You do not have permission to manage disputes');
        }
        const skip = (page - 1) * limit;
        const qb = this.disputeRepo.createQueryBuilder('d')
            .leftJoinAndSelect('d.order', 'o')
            .leftJoinAndSelect('d.customer', 'c')
            .leftJoinAndSelect('d.merchant', 'm');
        if (status) {
            qb.where('d.status = :status', { status });
        }
        qb.orderBy('d.createdAt', 'DESC').skip(skip).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async getDispute(id, requester) {
        if (![user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN].includes(requester.role)) {
            throw new common_1.ForbiddenException('Access denied');
        }
        const dispute = await this.disputeRepo.findOne({
            where: { id },
            relations: ['order', 'customer', 'merchant'],
        });
        if (!dispute)
            throw new common_1.NotFoundException('Dispute not found');
        return dispute;
    }
    async resolveDispute(id, dto, requester) {
        const dispute = await this.getDispute(id, requester);
        const updates = {
            status: sub_admin_features_entity_1.DisputeStatus.RESOLVED,
            resolution: dto.resolution,
        };
        if (dto.notes) {
            const existingNotes = dispute.notes || [];
            updates.notes = [...existingNotes, {
                    authorId: requester.id,
                    authorName: `${requester.firstName} ${requester.lastName}`,
                    content: dto.notes,
                    createdAt: new Date().toISOString(),
                    isResolution: true,
                }];
        }
        await this.disputeRepo.update(id, updates);
        if (dispute.reason === sub_admin_features_entity_1.DisputeReason.MERCHANT_CANCELLATION) {
            await this.ordersService.refundOrder(dispute.orderId, requester, `Dispute resolution: ${dto.resolution}`);
            this.logger.log(`Dispute ${id} resolved: Customer refunded, Merchant ${dispute.merchantId} order cancelled`);
        }
        const customerMessage = `Your dispute for order ${dispute.orderId} has been resolved. Resolution: ${dto.resolution}`;
        await this.notifications.createNotification(dispute.customerId, 'Dispute Resolved', customerMessage, notification_entity_1.NotificationType.DISPUTE, '/dashboard/orders');
        const merchantMessage = `A dispute for order ${dispute.orderId} has been resolved. Resolution: ${dto.resolution}`;
        await this.notifications.createNotificationForMerchant(dispute.merchantId, 'Dispute Resolved', merchantMessage, notification_entity_1.NotificationType.DISPUTE, '/merchant/orders');
        await this.logActivity(requester.id, 'resolve_dispute', 'dispute', id, { resolution: dto.resolution, reason: dispute.reason });
        return this.getDispute(id, requester);
    }
    async addDisputeNote(id, dto, requester) {
        const dispute = await this.getDispute(id, requester);
        const existingNotes = dispute.notes || [];
        const newNotes = [...existingNotes, {
                authorId: requester.id,
                authorName: `${requester.firstName} ${requester.lastName}`,
                content: dto.note,
                createdAt: new Date().toISOString(),
            }];
        await this.disputeRepo.update(id, { notes: newNotes });
        return this.getDispute(id, requester);
    }
    async listActivityLogs(page = 1, limit = 50, adminId) {
        const skip = (page - 1) * limit;
        const qb = this.activityLogRepo.createQueryBuilder('l')
            .leftJoinAndSelect('l.admin', 'a')
            .orderBy('l.createdAt', 'DESC');
        if (adminId) {
            qb.where('l.adminId = :adminId', { adminId });
        }
        qb.skip(skip).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async getPermissions(userId, requester) {
        if (requester.role !== user_entity_1.UserRole.ADMIN && requester.id !== userId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        let permissions = await this.permissionRepo.findOneBy({ userId });
        if (!permissions) {
            permissions = this.permissionRepo.create({ userId });
            await this.permissionRepo.save(permissions);
        }
        return permissions;
    }
    async updatePermissions(userId, dto, requester) {
        if (requester.role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Only admins can update permissions');
        }
        await this.permissionRepo.upsert({ ...dto, userId }, ['userId']);
        await this.logActivity(requester.id, 'update_permissions', 'user', userId, dto);
        return this.getPermissions(userId, requester);
    }
    async listReports(requester, page = 1, limit = 20) {
        const [data, total] = await this.reportRepo.findAndCount({
            where: { adminId: requester.id },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async generateReport(requester, dto) {
        const now = new Date();
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [merchants, content, reviews] = await Promise.all([
            this.activityLogRepo.count({ where: { adminId: requester.id, action: 'approve_merchant', createdAt: (0, typeorm_2.MoreThanOrEqual)(lastWeek) } }),
            this.activityLogRepo.count({ where: { adminId: requester.id, action: 'moderate_content', createdAt: (0, typeorm_2.MoreThanOrEqual)(lastWeek) } }),
            this.activityLogRepo.count({ where: { adminId: requester.id, action: 'moderate_review', createdAt: (0, typeorm_2.MoreThanOrEqual)(lastWeek) } }),
        ]);
        const reportData = {
            period: 'Last 7 Days',
            stats: {
                merchantsApproved: merchants,
                contentModerated: content,
                reviewsModerated: reviews,
            },
            generatedAt: now.toISOString(),
        };
        const report = this.reportRepo.create({
            adminId: requester.id,
            title: dto.title || `Moderation Summary - ${now.toLocaleDateString()}`,
            description: dto.description || 'Automatically generated weekly moderation report.',
            status: sub_admin_features_entity_1.ReportStatus.SUBMITTED,
            data: reportData,
        });
        return this.reportRepo.save(report);
    }
    async exportActivityLog(requester) {
        const logs = await this.activityLogRepo.find({
            where: { adminId: requester.id },
            order: { createdAt: 'DESC' },
            take: 1000,
        });
        return {
            filename: `activity_log_${new Date().toISOString().slice(0, 10)}.json`,
            data: logs,
        };
    }
    async checkPermission(userId, permissionField) {
        const user = await this.userRepo.findOneBy({ id: userId });
        if (!user)
            return false;
        if (user.role === user_entity_1.UserRole.ADMIN)
            return true;
        if (user.role !== user_entity_1.UserRole.SUB_ADMIN)
            return false;
        const permissions = await this.permissionRepo.findOneBy({ userId });
        if (!permissions)
            return false;
        return !!permissions[permissionField];
    }
    async logActivity(adminId, action, targetType, targetId, details) {
        try {
            const log = this.activityLogRepo.create({
                adminId,
                action,
                targetType,
                targetId,
                details,
            });
            await this.activityLogRepo.save(log);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const stack = err instanceof Error ? err.stack : undefined;
            this.logger.error(`Failed to log activity: ${message}`, stack);
        }
    }
};
exports.SubAdminService = SubAdminService;
exports.SubAdminService = SubAdminService = SubAdminService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(supporting_entities_1.Merchant)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(review_coupon_entities_1.Review)),
    __param(3, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(4, (0, typeorm_1.InjectRepository)(sub_admin_features_entity_1.Dispute)),
    __param(5, (0, typeorm_1.InjectRepository)(sub_admin_features_entity_1.AdminActivityLog)),
    __param(6, (0, typeorm_1.InjectRepository)(sub_admin_features_entity_2.SubAdminPermission)),
    __param(7, (0, typeorm_1.InjectRepository)(sub_admin_features_entity_1.SubAdminReport)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        merchants_service_1.MerchantsService,
        orders_service_1.OrdersService,
        notifications_service_1.NotificationsService])
], SubAdminService);
//# sourceMappingURL=sub-admin.service.js.map