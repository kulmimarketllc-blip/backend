import { Repository } from 'typeorm';
import { Merchant } from '../database/entities/supporting.entities';
import { User } from '../database/entities/user.entity';
import { Review } from '../database/entities/review-coupon.entities';
import { Product } from '../database/entities/product.entity';
import { MerchantsService } from '../merchants/merchants.service';
import { Dispute, AdminActivityLog, DisputeStatus, SubAdminReport } from '../database/entities/sub-admin-features.entity';
import { ApproveMerchantDto } from './dto/approve-merchant.dto';
import { RejectMerchantDto } from './dto/reject-merchant.dto';
import { ListPendingMerchantsDto } from './dto/list-pending-merchants.dto';
import { ListFlaggedReviewsDto } from './dto/list-flagged-reviews.dto';
import { ReviewModerationDto } from './dto/review-moderation.dto';
import { ListFlaggedContentDto } from './dto/list-flagged-content.dto';
import { ContentModerationDto } from './dto/content-moderation.dto';
import { UserModerationDto } from './dto/user-moderation.dto';
import { ResolveDisputeDto, DisputeNoteDto } from './dto/dispute.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SubAdminPermission } from '../database/entities/sub-admin-features.entity';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class SubAdminService {
    private readonly merchantRepo;
    private readonly userRepo;
    private readonly reviewRepo;
    private readonly productRepo;
    private readonly disputeRepo;
    private readonly activityLogRepo;
    private readonly permissionRepo;
    private readonly reportRepo;
    private readonly merchantsService;
    private readonly ordersService;
    private readonly notifications;
    private readonly logger;
    constructor(merchantRepo: Repository<Merchant>, userRepo: Repository<User>, reviewRepo: Repository<Review>, productRepo: Repository<Product>, disputeRepo: Repository<Dispute>, activityLogRepo: Repository<AdminActivityLog>, permissionRepo: Repository<SubAdminPermission>, reportRepo: Repository<SubAdminReport>, merchantsService: MerchantsService, ordersService: OrdersService, notifications: NotificationsService);
    listPendingMerchants(query: ListPendingMerchantsDto, requester: User): Promise<{
        data: Merchant[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getPendingMerchantsCount(requester: User): Promise<number>;
    approveMerchant(merchantId: string, dto: ApproveMerchantDto, requester: User): Promise<Merchant>;
    rejectMerchant(merchantId: string, dto: RejectMerchantDto, requester: User): Promise<Merchant>;
    getMerchantForModeration(merchantId: string, requester: User): Promise<Merchant>;
    listFlaggedReviews(query: ListFlaggedReviewsDto, requester: User): Promise<{
        data: Review[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getFlaggedReviewsCount(requester: User): Promise<number>;
    moderateReview(reviewId: string, dto: ReviewModerationDto, requester: User): Promise<Review>;
    listFlaggedContent(query: ListFlaggedContentDto, requester: User): Promise<{
        data: Product[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getFlaggedContentCount(requester: User): Promise<number>;
    moderateContent(productId: string, dto: ContentModerationDto, requester: User): Promise<Product>;
    moderateUser(userId: string, dto: UserModerationDto, requester: User): Promise<User>;
    listUsers(query: ListUsersDto, requester: User): Promise<{
        data: User[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    listDisputes(page?: number, limit?: number, status?: DisputeStatus, requester?: User): Promise<{
        data: Dispute[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getDispute(id: string, requester: User): Promise<Dispute>;
    resolveDispute(id: string, dto: ResolveDisputeDto, requester: User): Promise<Dispute>;
    addDisputeNote(id: string, dto: DisputeNoteDto, requester: User): Promise<Dispute>;
    listActivityLogs(page?: number, limit?: number, adminId?: string): Promise<{
        data: AdminActivityLog[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getPermissions(userId: string, requester: User): Promise<SubAdminPermission>;
    updatePermissions(userId: string, dto: Partial<SubAdminPermission>, requester: User): Promise<SubAdminPermission>;
    listReports(requester: User, page?: number, limit?: number): Promise<{
        data: SubAdminReport[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    generateReport(requester: User, dto: {
        title: string;
        description?: string;
    }): Promise<SubAdminReport>;
    exportActivityLog(requester: User): Promise<{
        filename: string;
        data: AdminActivityLog[];
    }>;
    private checkPermission;
    private logActivity;
}
