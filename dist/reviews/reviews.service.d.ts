import { Repository, DataSource } from 'typeorm';
import { Review, ReviewHelpful, ReviewStatus } from '../database/entities/review-coupon.entities';
import { Product } from '../database/entities/product.entity';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { MerchantReplyDto } from './dto/merchant-reply.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ReviewsService {
    private readonly reviewsRepo;
    private readonly helpfulRepo;
    private readonly productsRepo;
    private readonly ordersRepo;
    private readonly dataSource;
    private readonly notifications;
    private readonly logger;
    constructor(reviewsRepo: Repository<Review>, helpfulRepo: Repository<ReviewHelpful>, productsRepo: Repository<Product>, ordersRepo: Repository<Order>, dataSource: DataSource, notifications: NotificationsService);
    create(dto: CreateReviewDto, user: User): Promise<Review>;
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
            product: Product;
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
    findByMerchant(merchantId: string, query: ReviewQueryDto): Promise<{
        data: Review[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<Review>;
    update(id: string, dto: UpdateReviewDto, user: User): Promise<Review>;
    remove(id: string, user: User): Promise<void>;
    addMerchantReply(id: string, dto: MerchantReplyDto, merchantId: string): Promise<Review>;
    updateMerchantReply(id: string, dto: MerchantReplyDto, merchantId: string): Promise<Review>;
    markHelpful(reviewId: string, userId: string): Promise<{
        helpfulCount: number;
    }>;
    moderate(id: string, status: ReviewStatus, adminId: string): Promise<Review>;
    flag(id: string): Promise<{
        success: boolean;
    }>;
    getRatingBreakdown(productId: string): Promise<{
        average: number;
        total: number;
        breakdown: Record<number, number>;
        percentages: {
            [k: string]: number;
        };
    }>;
    private recalculateProductRating;
}
