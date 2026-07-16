import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Merchant, MerchantStatus } from '../database/entities/supporting.entities';
import { User, UserRole } from '../database/entities/user.entity';
import { Review, ReviewStatus } from '../database/entities/review-coupon.entities';
import { Product, ProductStatus } from '../database/entities/product.entity';
import { MerchantsService } from '../merchants/merchants.service';
import { Dispute, AdminActivityLog, DisputeStatus, DisputeReason, SubAdminReport, ReportStatus } from '../database/entities/sub-admin-features.entity';
import { ApproveMerchantDto } from './dto/approve-merchant.dto';
import { RejectMerchantDto } from './dto/reject-merchant.dto';
import { ListPendingMerchantsDto } from './dto/list-pending-merchants.dto';
import { ListFlaggedReviewsDto } from './dto/list-flagged-reviews.dto';
import { ReviewModerationDto, ReviewModerationAction } from './dto/review-moderation.dto';
import { ListFlaggedContentDto } from './dto/list-flagged-content.dto';
import { ContentModerationDto, ContentModerationAction } from './dto/content-moderation.dto';
import { UserModerationDto, UserModerationAction } from './dto/user-moderation.dto';
import { ResolveDisputeDto, UpdateDisputeStatusDto, DisputeNoteDto } from './dto/dispute.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SubAdminPermission } from '../database/entities/sub-admin-features.entity';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/entities/notification.entity';

@Injectable()
export class SubAdminService {
  private readonly logger = new Logger(SubAdminService.name);

  constructor(
    @InjectRepository(Merchant) private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Dispute) private readonly disputeRepo: Repository<Dispute>,
    @InjectRepository(AdminActivityLog) private readonly activityLogRepo: Repository<AdminActivityLog>,
    @InjectRepository(SubAdminPermission) private readonly permissionRepo: Repository<SubAdminPermission>,
    @InjectRepository(SubAdminReport) private readonly reportRepo: Repository<SubAdminReport>,
    private readonly merchantsService: MerchantsService,
    private readonly ordersService: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * List pending merchants awaiting approval
   * Sub-admins can only view/manage pending merchants
   */
  async listPendingMerchants(query: ListPendingMerchantsDto, requester: User) {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canApproveMerchants'))) {
      throw new ForbiddenException('You do not have permission to view pending merchants');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    const qb = this.merchantRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .where('m.status = :status', { status: MerchantStatus.PENDING });

    if (query.search) {
      qb.andWhere(
        '(m.storeName ILIKE :search OR u.email ILIKE :search OR m.id = :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy(`m.${sortBy}`, sortOrder as 'ASC' | 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get pending merchants count
   */
  async getPendingMerchantsCount(requester: User): Promise<number> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Only sub-admins can view pending merchants');
    }

    return this.merchantRepo.countBy({ status: MerchantStatus.PENDING });
  }

  /**
   * Approve a pending merchant
   */
  async approveMerchant(merchantId: string, dto: ApproveMerchantDto, requester: User): Promise<Merchant> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canApproveMerchants'))) {
      throw new ForbiddenException('You do not have permission to approve merchants');
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      relations: ['user'],
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    if (merchant.status !== MerchantStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve merchant with status "${merchant.status}". Only pending merchants can be approved.`,
      );
    }

    // Validate commission rate
    if (dto.commissionRate < 0.5 || dto.commissionRate > 50) {
      throw new BadRequestException('Commission rate must be between 0.5% and 50%');
    }

    // Update merchant
    await this.merchantRepo.update(merchantId, {
      status: MerchantStatus.APPROVED,
      commissionRate: dto.commissionRate,
    });

    // Update user role to MERCHANT
    await this.userRepo.update(merchant.userId, {
      role: UserRole.MERCHANT,
    });

    const updated = await this.merchantRepo.findOne({
      where: { id: merchantId },
      relations: ['user'],
    });

    this.logger.log(
      `Merchant approved: ${merchantId} (${merchant.storeName}) by ${requester.id} with commission ${dto.commissionRate}%`,
    );

    await this.logActivity(
      requester.id,
      'approve_merchant',
      'merchant',
      merchantId,
      { storeName: merchant.storeName, commissionRate: dto.commissionRate },
    );

    // Notify merchant user
    await this.notifications.createNotification(
      merchant.userId,
      '🎉 Store Approved',
      `Congratulations! Your store "${merchant.storeName}" has been approved. You can now start listing products.`,
      NotificationType.SYSTEM,
      '/merchant/dashboard'
    );

    return updated!;
  }

  /**
   * Reject a pending merchant
   */
  async rejectMerchant(merchantId: string, dto: RejectMerchantDto, requester: User): Promise<Merchant> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canApproveMerchants'))) {
      throw new ForbiddenException('You do not have permission to reject merchants');
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      relations: ['user'],
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    if (merchant.status !== MerchantStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject merchant with status "${merchant.status}". Only pending merchants can be rejected.`,
      );
    }

    if (!dto.reason || dto.reason.trim().length < 10) {
      throw new BadRequestException('Rejection reason must be at least 10 characters long.');
    }

    // Update merchant with rejection
    await this.merchantRepo.update(merchantId, {
      status: MerchantStatus.REJECTED,
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

    this.logger.log(
      `Merchant rejected: ${merchantId} (${merchant.storeName}) by ${requester.id} — Reason: ${dto.reason}`,
    );

    await this.logActivity(
      requester.id,
      'reject_merchant',
      'merchant',
      merchantId,
      { storeName: merchant.storeName, reason: dto.reason },
    );

    // Notify merchant user
    await this.notifications.createNotification(
      merchant.userId,
      '❌ Store Application Rejected',
      `We regret to inform you that your store application for "${merchant.storeName}" was rejected. Reason: ${dto.reason}`,
      NotificationType.SYSTEM
    );

    return updated!;
  }

  /**
   * Get merchant detail for moderation
   */
  async getMerchantForModeration(merchantId: string, requester: User): Promise<Merchant> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Only sub-admins can view merchant details');
    }

    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      relations: ['user'],
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant ${merchantId} not found`);
    }

    return merchant;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── REVIEW MODERATION ────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * List flagged reviews awaiting moderation
   */
  async listFlaggedReviews(query: ListFlaggedReviewsDto, requester: User) {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canModerateReviews'))) {
      throw new ForbiddenException('You do not have permission to view flagged reviews');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortOrder = (query.sortOrder || 'DESC') as 'ASC' | 'DESC';
    const sortColumnMap: Record<string, string> = {
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
      qb.andWhere(
        '(r.id = :search OR p.id = :search OR p.name ILIKE :searchText)',
        { search: query.search, searchText: `%${query.search}%` },
      );
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

  /**
   * Get flagged reviews count
   */
  async getFlaggedReviewsCount(requester: User): Promise<number> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Only sub-admins can view flagged reviews');
    }

    const count = await this.reviewRepo.count({ where: { flagCount: MoreThanOrEqual(1) } });
    console.log('[SubAdminService] getFlaggedReviewsCount:', count);
    return count;
  }

  /**
   * Take moderation action on a flagged review
   */
  async moderateReview(
    reviewId: string,
    dto: ReviewModerationDto,
    requester: User,
  ): Promise<Review> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canModerateReviews'))) {
      throw new ForbiddenException('You do not have permission to moderate reviews');
    }

    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['product', 'user'],
    });

    if (!review) {
      throw new NotFoundException(`Review ${reviewId} not found`);
    }

    let newStatus = review.status;
    const updates: Partial<Review> = {};

    switch (dto.action) {
      case ReviewModerationAction.APPROVE:
        newStatus = ReviewStatus.APPROVED;
        break;
      case ReviewModerationAction.REJECT:
        newStatus = ReviewStatus.REJECTED;
        break;
      case ReviewModerationAction.REMOVE:
        // Mark as rejected and delete later (soft delete pattern)
        newStatus = ReviewStatus.REJECTED;
        break;
      case ReviewModerationAction.CLEAR_FLAGS:
        // Clear flags but don't change status
        updates.flagCount = 0;
        break;
    }

    if (dto.action !== ReviewModerationAction.CLEAR_FLAGS) {
      updates.status = newStatus;
      updates.flagCount = 0;
    }

    await this.reviewRepo.update(reviewId, updates);
    const updated = await this.reviewRepo.findOne({ where: { id: reviewId } });

    this.logger.log(
      `Review moderated: ${reviewId} by ${requester.id} — Action: ${dto.action} — Reason: ${dto.reason}`,
    );

    await this.logActivity(
      requester.id,
      'moderate_review',
      'review',
      reviewId,
      { action: dto.action, reason: dto.reason },
    );

    // Notify user if review was rejected/removed
    if (dto.action === ReviewModerationAction.REJECT || dto.action === ReviewModerationAction.REMOVE) {
      await this.notifications.createNotification(
        review.userId,
        '⚠️ Review Moderated',
        `Your review for "${review.product?.name || 'a product'}" has been removed as it violates our community guidelines. Reason: ${dto.reason}`,
        NotificationType.SYSTEM
      );
    }

    return updated!;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── CONTENT MODERATION (Products) ────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * List flagged content (products) awaiting moderation
   */
  async listFlaggedContent(query: ListFlaggedContentDto, requester: User) {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canViewDashboard'))) {
      throw new ForbiddenException('You do not have permission to view flagged content');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortOrder = (query.sortOrder || 'DESC') as 'ASC' | 'DESC';
    const sortColumnMap: Record<string, string> = {
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
      qb.andWhere(
        '(p.id = :search OR p.name ILIKE :searchText OR p.slug ILIKE :searchText)',
        { search: query.search, searchText: `%${query.search}%` },
      );
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

  /**
   * Get flagged content count
   */
  async getFlaggedContentCount(requester: User): Promise<number> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Only sub-admins can view flagged content');
    }

    const count = await this.productRepo.count({ where: { flagCount: MoreThanOrEqual(1) } });
    console.log('[SubAdminService] getFlaggedContentCount:', count);
    return count;
  }

  /**
   * Take moderation action on flagged content (product)
   */
  async moderateContent(
    productId: string,
    dto: ContentModerationDto,
    requester: User,
  ): Promise<Product> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canManageUsers'))) {
      throw new ForbiddenException('You do not have permission to moderate content');
    }

    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['merchant'],
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    let newStatus = product.status;
    const updates: Partial<Product> = {};

    switch (dto.action) {
      case ContentModerationAction.APPROVE:
        newStatus = ProductStatus.ACTIVE;
        updates.flagCount = 0;
        break;
      case ContentModerationAction.REJECT:
        newStatus = ProductStatus.REJECTED;
        updates.flagCount = 0;
        break;
      case ContentModerationAction.REMOVE:
        // Mark as inactive (equivalent to removal)
        newStatus = ProductStatus.INACTIVE;
        updates.flagCount = 0;
        break;
      case ContentModerationAction.SUSPEND_MERCHANT:
        // Suspend the merchant
        await this.merchantRepo.update(product.merchantId, {
          status: MerchantStatus.SUSPENDED,
        });
        newStatus = ProductStatus.INACTIVE;
        updates.flagCount = 0;
        this.logger.warn(
          `Merchant suspended: ${product.merchantId} due to content violation in product ${productId}`,
        );
        break;
      case ContentModerationAction.CLEAR_FLAGS:
        // Clear flags but don't change status
        updates.flagCount = 0;
        break;
    }

    if (dto.action !== ContentModerationAction.CLEAR_FLAGS) {
      updates.status = newStatus;
    }

    await this.productRepo.update(productId, updates);

    await this.logActivity(
      requester.id,
      'moderate_content',
      'product',
      productId,
      { action: dto.action, reason: dto.reason },
    );

    // Notify merchant
    const merchant = await this.merchantRepo.findOneBy({ id: product.merchantId });
    if (merchant) {
      let title = '⚠️ Product Moderated';
      let message = `Your product "${product.name}" has been moderated. Action: ${dto.action}. Reason: ${dto.reason}`;
      
      if (dto.action === ContentModerationAction.SUSPEND_MERCHANT) {
        title = '🚫 Account Suspended';
        message = `Your merchant account has been suspended due to content violations in product "${product.name}". Reason: ${dto.reason}`;
      }

      await this.notifications.createNotification(
        merchant.userId,
        title,
        message,
        NotificationType.SYSTEM
      );
    }

    const updated = await this.productRepo.findOne({ where: { id: productId } });

    this.logger.log(
      `Content moderated: ${productId} by ${requester.id} — Action: ${dto.action} — Reason: ${dto.reason}`,
    );

    return updated!;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── USER MODERATION ──────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Moderate a user account (warn, suspend, restore)
   */
  async moderateUser(userId: string, dto: UserModerationDto, requester: User): Promise<User> {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canManageUsers'))) {
      throw new ForbiddenException('You do not have permission to moderate users');
    }

    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const updates: Partial<User> = {};
    const logDetails: any = { action: dto.action, reason: dto.reason };

    switch (dto.action) {
      case UserModerationAction.WARN:
        updates.warningCount = (user.warningCount || 0) + 1;
        break;
      case UserModerationAction.SUSPEND:
        updates.isSuspended = true;
        updates.suspensionReason = dto.reason;
        updates.isActive = false;
        break;
      case UserModerationAction.RESTORE:
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

    await this.logActivity(
      requester.id,
      'moderate_user',
      'user',
      userId,
      { action: dto.action, reason: dto.reason },
    );

    // Notify user
    let title = '⚠️ Account Warning';
    let message = `You have received a warning on your account. Reason: ${dto.reason}`;
    
    if (dto.action === UserModerationAction.SUSPEND) {
      title = '🚫 Account Suspended';
      message = `Your account has been suspended. Reason: ${dto.reason}`;
    } else if (dto.action === UserModerationAction.RESTORE) {
      title = '✅ Account Restored';
      message = 'Your account has been restored. You can now log in and use our services.';
    }

    await this.notifications.createNotification(
      userId,
      title,
      message,
      NotificationType.SYSTEM
    );

    const updatedUser = await this.userRepo.findOneBy({ id: userId });

    return updatedUser!;
  }

  /**
   * List users for moderation (customers, merchants, delivery partners)
   */
  async listUsers(query: ListUsersDto, requester: User) {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (!(await this.checkPermission(requester.id, 'canManageUsers'))) {
      throw new ForbiddenException('You do not have permission to list users');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('u')
      .where('u.deleted_at IS NULL');

    if (query.role) {
      qb.andWhere('u.role = :role', { role: query.role });
    } else {
      // By default, hide admins from sub-admins
      qb.andWhere('u.role NOT IN (:...adminRoles)', { 
          adminRoles: [UserRole.ADMIN] 
        });
    }

    if (query.status) {
      if (query.status === 'active') qb.andWhere('u.is_active = true AND u.is_suspended = false');
      if (query.status === 'inactive') qb.andWhere('u.is_active = false');
      if (query.status === 'suspended') qb.andWhere('u.is_suspended = true');
    }

    if (query.search) {
      qb.andWhere(
        '(u.firstName ILIKE :search OR u.lastName ILIKE :search OR u.email ILIKE :search OR u.phone ILIKE :search)',
        { search: `%${query.search}%` },
      );
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

  // ════════════════════════════════════════════════════════════════════════════
  // ── DISPUTE MANAGEMENT ───────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  async listDisputes(page = 1, limit = 20, status?: DisputeStatus, requester?: User) {
    if (requester && ![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    if (requester && !(await this.checkPermission(requester.id, 'canManageDisputes'))) {
      throw new ForbiddenException('You do not have permission to manage disputes');
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

  async getDispute(id: string, requester: User) {
    if (![UserRole.SUB_ADMIN, UserRole.ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Access denied');
    }

    const dispute = await this.disputeRepo.findOne({
      where: { id },
      relations: ['order', 'customer', 'merchant'],
    });

    if (!dispute) throw new NotFoundException('Dispute not found');
    return dispute;
  }

  async resolveDispute(id: string, dto: ResolveDisputeDto, requester: User) {
    const dispute = await this.getDispute(id, requester);
    
    const updates: Partial<Dispute> = {
      status: DisputeStatus.RESOLVED,
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
    
    // Outcome logic: "merchant loses money, subadmin returns money to customer"
    if (dispute.reason === DisputeReason.MERCHANT_CANCELLATION) {
      // 1. Return money to customer (Refund order)
      await this.ordersService.refundOrder(dispute.orderId, requester, `Dispute resolution: ${dto.resolution}`);
      
      this.logger.log(`Dispute ${id} resolved: Customer refunded, Merchant ${dispute.merchantId} order cancelled`);
    }

    const customerMessage = `Your dispute for order ${dispute.orderId} has been resolved. Resolution: ${dto.resolution}`;
    await this.notifications.createNotification(
      dispute.customerId,
      'Dispute Resolved',
      customerMessage,
      NotificationType.DISPUTE,
      '/dashboard/orders',
    );

    const merchantMessage = `A dispute for order ${dispute.orderId} has been resolved. Resolution: ${dto.resolution}`;
    await this.notifications.createNotificationForMerchant(
      dispute.merchantId,
      'Dispute Resolved',
      merchantMessage,
      NotificationType.DISPUTE,
      '/merchant/orders',
    );

    await this.logActivity(
      requester.id,
      'resolve_dispute',
      'dispute',
      id,
      { resolution: dto.resolution, reason: dispute.reason }
    );

    return this.getDispute(id, requester);
  }

  async addDisputeNote(id: string, dto: DisputeNoteDto, requester: User) {
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

  // ════════════════════════════════════════════════════════════════════════════
  // ── ADMIN LOGS ──────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  async listActivityLogs(page = 1, limit = 50, adminId?: string) {
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

  // ════════════════════════════════════════════════════════════════════════════
  // ── PERMISSIONS ──────────────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  async getPermissions(userId: string, requester: User) {
    if (requester.role !== UserRole.ADMIN && requester.id !== userId) {
      throw new ForbiddenException('Access denied');
    }

    let permissions = await this.permissionRepo.findOneBy({ userId });
    
    // If none exist, create default
    if (!permissions) {
      permissions = this.permissionRepo.create({ userId });
      await this.permissionRepo.save(permissions);
    }

    return permissions;
  }

  async updatePermissions(userId: string, dto: Partial<SubAdminPermission>, requester: User) {
    if (requester.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can update permissions');
    }

    await this.permissionRepo.upsert({ ...dto, userId }, ['userId']);
    
    await this.logActivity(
      requester.id,
      'update_permissions',
      'user',
      userId,
      dto
    );

    return this.getPermissions(userId, requester);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ── REPORTS & EXPORT ──────────────────────────────────────────────────
  // ════════════════════════════════════════════════════════════════════════════

  async listReports(requester: User, page = 1, limit = 20) {
    const [data, total] = await this.reportRepo.findAndCount({
      where: { adminId: requester.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async generateReport(requester: User, dto: { title: string; description?: string }) {
    // Generate a summary report of recent moderation activities
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [merchants, content, reviews] = await Promise.all([
      this.activityLogRepo.count({ where: { adminId: requester.id, action: 'approve_merchant', createdAt: MoreThanOrEqual(lastWeek) } }),
      this.activityLogRepo.count({ where: { adminId: requester.id, action: 'moderate_content', createdAt: MoreThanOrEqual(lastWeek) } }),
      this.activityLogRepo.count({ where: { adminId: requester.id, action: 'moderate_review', createdAt: MoreThanOrEqual(lastWeek) } }),
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
      status: ReportStatus.SUBMITTED,
      data: reportData,
    });

    return this.reportRepo.save(report);
  }

  async exportActivityLog(requester: User) {
    const logs = await this.activityLogRepo.find({
      where: { adminId: requester.id },
      order: { createdAt: 'DESC' },
      take: 1000,
    });

    // Simple JSON export for now, frontend can convert to CSV if needed
    // or we could use a library like 'json2csv' here.
    return {
      filename: `activity_log_${new Date().toISOString().slice(0, 10)}.json`,
      data: logs,
    };
  }

  /**
   * Internal helper to check if a sub-admin has a specific permission
   */
  private async checkPermission(userId: string, permissionField: keyof SubAdminPermission): Promise<boolean> {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) return false;

    // Admins have all permissions
    if (user.role === UserRole.ADMIN) return true;
    if (user.role !== UserRole.SUB_ADMIN) return false;

    const permissions = await this.permissionRepo.findOneBy({ userId });
    if (!permissions) return false;

    return !!permissions[permissionField];
  }

  /**
   * Helper to log admin activity
   */
  private async logActivity(
    adminId: string,
    action: string,
    targetType: string,
    targetId: string,
    details?: any,
  ) {
    try {
      const log = this.activityLogRepo.create({
        adminId,
        action,
        targetType,
        targetId,
        details,
      });
      await this.activityLogRepo.save(log);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Failed to log activity: ${message}`, stack);
    }
  }
}
