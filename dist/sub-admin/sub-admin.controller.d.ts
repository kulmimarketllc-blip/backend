import { SubAdminService } from './sub-admin.service';
import { User } from '../database/entities/user.entity';
import { Merchant } from '../database/entities/supporting.entities';
import { ApproveMerchantDto } from './dto/approve-merchant.dto';
import { RejectMerchantDto } from './dto/reject-merchant.dto';
import { ListPendingMerchantsDto } from './dto/list-pending-merchants.dto';
import { ListFlaggedReviewsDto } from './dto/list-flagged-reviews.dto';
import { ReviewModerationDto } from './dto/review-moderation.dto';
import { ListFlaggedContentDto } from './dto/list-flagged-content.dto';
import { ContentModerationDto } from './dto/content-moderation.dto';
import { Review } from '../database/entities/review-coupon.entities';
import { Product } from '../database/entities/product.entity';
import { UserModerationDto } from './dto/user-moderation.dto';
import { ResolveDisputeDto, DisputeNoteDto } from './dto/dispute.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { DisputeStatus } from '../database/entities/sub-admin-features.entity';
export declare class SubAdminController {
    private readonly subAdminService;
    constructor(subAdminService: SubAdminService);
    listPendingMerchants(query: ListPendingMerchantsDto, requester: User): Promise<{
        data: Merchant[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getPendingMerchantsCount(requester: User): Promise<{
        count: number;
    }>;
    getMerchantDetail(merchantId: string, requester: User): Promise<Merchant>;
    approveMerchant(merchantId: string, dto: ApproveMerchantDto, requester: User): Promise<Merchant>;
    rejectMerchant(merchantId: string, dto: RejectMerchantDto, requester: User): Promise<Merchant>;
    listFlaggedReviews(query: ListFlaggedReviewsDto, requester: User): Promise<{
        data: Review[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    getFlaggedReviewsCount(requester: User): Promise<{
        count: number;
    }>;
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
    getFlaggedContentCount(requester: User): Promise<{
        count: number;
    }>;
    moderateContent(productId: string, dto: ContentModerationDto, requester: User): Promise<Product>;
    listUsers(query: ListUsersDto, requester: User): Promise<{
        data: User[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    moderateUser(userId: string, dto: UserModerationDto, requester: User): Promise<User>;
    listDisputes(page?: number, limit?: number, status?: DisputeStatus, requester?: User): Promise<{
        data: import("../database/entities/sub-admin-features.entity").Dispute[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getDispute(id: string, requester: User): Promise<import("../database/entities/sub-admin-features.entity").Dispute>;
    resolveDispute(id: string, dto: ResolveDisputeDto, requester: User): Promise<import("../database/entities/sub-admin-features.entity").Dispute>;
    addDisputeNote(id: string, dto: DisputeNoteDto, requester: User): Promise<import("../database/entities/sub-admin-features.entity").Dispute>;
    listActivityLogs(page?: number, limit?: number, adminId?: string, requester?: User): Promise<{
        data: import("../database/entities/sub-admin-features.entity").AdminActivityLog[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getPermissions(userId: string, requester: User): Promise<import("../database/entities/sub-admin-features.entity").SubAdminPermission>;
    updatePermissions(userId: string, dto: any, requester: User): Promise<import("../database/entities/sub-admin-features.entity").SubAdminPermission>;
    listReports(page: number | undefined, limit: number | undefined, requester: User): Promise<{
        data: import("../database/entities/sub-admin-features.entity").SubAdminReport[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    generateReport(dto: {
        title: string;
        description?: string;
    }, requester: User): Promise<import("../database/entities/sub-admin-features.entity").SubAdminReport>;
    exportActivityLog(requester: User): Promise<{
        filename: string;
        data: import("../database/entities/sub-admin-features.entity").AdminActivityLog[];
    }>;
}
