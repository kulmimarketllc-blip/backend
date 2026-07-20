import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, MerchantReplyDto, ModerateReviewDto, ReviewQueryDto } from './dto/index';
import { User } from '../database/entities/user.entity';
import { ReviewStatus } from '../database/entities/review-coupon.entities';
import { MerchantsService } from '../merchants/merchants.service';
export declare class ReviewsController {
    private readonly reviewsService;
    private readonly merchantsService;
    constructor(reviewsService: ReviewsService, merchantsService: MerchantsService);
    create(dto: CreateReviewDto, user: User): Promise<import("../database/entities/review-coupon.entities").Review>;
    findByProduct(productId: string, query: ReviewQueryDto): Promise<{
        data: {
            user: {
                id: string;
                firstName: string;
                lastName: string;
                avatarUrl: string | undefined;
            } | null;
            productId: string;
            userId: string;
            orderId: string;
            rating: number;
            title?: string;
            comment?: string;
            images?: string[];
            isVerifiedPurchase: boolean;
            helpfulCount: number;
            flagCount: number;
            status: ReviewStatus;
            merchantReply?: string;
            merchantRepliedAt?: Date;
            merchantId?: string;
            product: import("../database/entities/product.entity").Product;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            deletedAt?: Date;
        }[];
        breakdown: {
            average: number;
            total: number;
            breakdown: Record<number, number>;
            percentages: {
                [k: string]: number;
            };
        };
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getRatingBreakdown(productId: string): Promise<{
        average: number;
        total: number;
        breakdown: Record<number, number>;
        percentages: {
            [k: string]: number;
        };
    }>;
    findByMerchant(merchantId: string, query: ReviewQueryDto): Promise<{
        data: import("../database/entities/review-coupon.entities").Review[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<import("../database/entities/review-coupon.entities").Review>;
    update(id: string, dto: UpdateReviewDto, user: User): Promise<import("../database/entities/review-coupon.entities").Review>;
    remove(id: string, user: User): Promise<void>;
    addReply(id: string, dto: MerchantReplyDto, user: User): Promise<import("../database/entities/review-coupon.entities").Review>;
    updateReply(id: string, dto: MerchantReplyDto, user: User): Promise<import("../database/entities/review-coupon.entities").Review>;
    markHelpful(id: string, user: User): Promise<{
        helpfulCount: number;
    }>;
    moderate(id: string, dto: ModerateReviewDto, user: User): Promise<import("../database/entities/review-coupon.entities").Review>;
    flag(id: string): Promise<{
        success: boolean;
    }>;
}
