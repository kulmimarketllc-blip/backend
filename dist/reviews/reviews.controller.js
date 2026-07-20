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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const reviews_service_1 = require("./reviews.service");
const index_1 = require("./dto/index");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_entity_1 = require("../database/entities/user.entity");
const merchants_service_1 = require("../merchants/merchants.service");
let ReviewsController = class ReviewsController {
    constructor(reviewsService, merchantsService) {
        this.reviewsService = reviewsService;
        this.merchantsService = merchantsService;
    }
    create(dto, user) {
        return this.reviewsService.create(dto, user);
    }
    findByProduct(productId, query) {
        return this.reviewsService.findByProduct(productId, query);
    }
    getRatingBreakdown(productId) {
        return this.reviewsService.getRatingBreakdown(productId);
    }
    findByMerchant(merchantId, query) {
        return this.reviewsService.findByMerchant(merchantId, query);
    }
    findOne(id) {
        return this.reviewsService.findOne(id);
    }
    update(id, dto, user) {
        return this.reviewsService.update(id, dto, user);
    }
    remove(id, user) {
        return this.reviewsService.remove(id, user);
    }
    async addReply(id, dto, user) {
        const merchant = await this.merchantsService.findByUserId(user.id);
        if (!merchant?.id) {
            throw new common_1.NotFoundException('No merchant store found for this user');
        }
        return this.reviewsService.addMerchantReply(id, dto, merchant.id);
    }
    async updateReply(id, dto, user) {
        const merchant = await this.merchantsService.findByUserId(user.id);
        if (!merchant?.id) {
            throw new common_1.NotFoundException('No merchant store found for this user');
        }
        return this.reviewsService.updateMerchantReply(id, dto, merchant.id);
    }
    markHelpful(id, user) {
        return this.reviewsService.markHelpful(id, user.id);
    }
    moderate(id, dto, user) {
        return this.reviewsService.moderate(id, dto.status, user.id);
    }
    flag(id) {
        return this.reviewsService.flag(id);
    }
};
exports.ReviewsController = ReviewsController;
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a product review (verified purchases only)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_1.CreateReviewDto, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "create", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('product/:productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all reviews for a product with rating breakdown' }),
    (0, swagger_1.ApiParam)({ name: 'productId', description: 'Product ID' }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_1.ReviewQueryDto]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "findByProduct", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('product/:productId/breakdown'),
    (0, swagger_1.ApiOperation)({ summary: 'Get rating breakdown for a product' }),
    __param(0, (0, common_1.Param)('productId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "getRatingBreakdown", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('merchant/:merchantId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all reviews for a merchant store' }),
    __param(0, (0, common_1.Param)('merchantId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_1.ReviewQueryDto]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "findByMerchant", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a single review by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update own review (within 48 hours)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_1.UpdateReviewDto,
        user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a review (owner or admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "remove", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/reply'),
    (0, swagger_1.ApiOperation)({ summary: 'Merchant replies to a review' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_1.MerchantReplyDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "addReply", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Put)(':id/reply'),
    (0, swagger_1.ApiOperation)({ summary: 'Merchant updates their reply' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_1.MerchantReplyDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], ReviewsController.prototype, "updateReply", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)(':id/helpful'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle helpful vote on a review' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "markHelpful", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, common_1.Patch)(':id/moderate'),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: approve / reject / flag a review' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_1.ModerateReviewDto,
        user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "moderate", null);
__decorate([
    (0, common_1.Post)(':id/flag'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Flag review for moderation' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReviewsController.prototype, "flag", null);
exports.ReviewsController = ReviewsController = __decorate([
    (0, swagger_1.ApiTags)('reviews'),
    (0, common_1.Controller)('reviews'),
    __metadata("design:paramtypes", [reviews_service_1.ReviewsService,
        merchants_service_1.MerchantsService])
], ReviewsController);
//# sourceMappingURL=reviews.controller.js.map