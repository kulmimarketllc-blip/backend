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
exports.SubAdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const sub_admin_service_1 = require("./sub-admin.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_entity_1 = require("../database/entities/user.entity");
const approve_merchant_dto_1 = require("./dto/approve-merchant.dto");
const reject_merchant_dto_1 = require("./dto/reject-merchant.dto");
const list_pending_merchants_dto_1 = require("./dto/list-pending-merchants.dto");
const list_flagged_reviews_dto_1 = require("./dto/list-flagged-reviews.dto");
const review_moderation_dto_1 = require("./dto/review-moderation.dto");
const list_flagged_content_dto_1 = require("./dto/list-flagged-content.dto");
const content_moderation_dto_1 = require("./dto/content-moderation.dto");
const user_moderation_dto_1 = require("./dto/user-moderation.dto");
const dispute_dto_1 = require("./dto/dispute.dto");
const list_users_dto_1 = require("./dto/list-users.dto");
const sub_admin_features_entity_1 = require("../database/entities/sub-admin-features.entity");
let SubAdminController = class SubAdminController {
    constructor(subAdminService) {
        this.subAdminService = subAdminService;
    }
    async listPendingMerchants(query, requester) {
        return this.subAdminService.listPendingMerchants(query, requester);
    }
    async getPendingMerchantsCount(requester) {
        const count = await this.subAdminService.getPendingMerchantsCount(requester);
        return { count };
    }
    async getMerchantDetail(merchantId, requester) {
        return this.subAdminService.getMerchantForModeration(merchantId, requester);
    }
    async approveMerchant(merchantId, dto, requester) {
        return this.subAdminService.approveMerchant(merchantId, dto, requester);
    }
    async rejectMerchant(merchantId, dto, requester) {
        return this.subAdminService.rejectMerchant(merchantId, dto, requester);
    }
    async listFlaggedReviews(query, requester) {
        return this.subAdminService.listFlaggedReviews(query, requester);
    }
    async getFlaggedReviewsCount(requester) {
        const count = await this.subAdminService.getFlaggedReviewsCount(requester);
        return { count };
    }
    async moderateReview(reviewId, dto, requester) {
        return this.subAdminService.moderateReview(reviewId, dto, requester);
    }
    async listFlaggedContent(query, requester) {
        return this.subAdminService.listFlaggedContent(query, requester);
    }
    async getFlaggedContentCount(requester) {
        const count = await this.subAdminService.getFlaggedContentCount(requester);
        return { count };
    }
    async moderateContent(productId, dto, requester) {
        return this.subAdminService.moderateContent(productId, dto, requester);
    }
    async listUsers(query, requester) {
        return this.subAdminService.listUsers(query, requester);
    }
    async moderateUser(userId, dto, requester) {
        return this.subAdminService.moderateUser(userId, dto, requester);
    }
    async listDisputes(page = 1, limit = 20, status, requester) {
        return this.subAdminService.listDisputes(+page, +limit, status, requester);
    }
    async getDispute(id, requester) {
        return this.subAdminService.getDispute(id, requester);
    }
    async resolveDispute(id, dto, requester) {
        return this.subAdminService.resolveDispute(id, dto, requester);
    }
    async addDisputeNote(id, dto, requester) {
        return this.subAdminService.addDisputeNote(id, dto, requester);
    }
    async listActivityLogs(page = 1, limit = 50, adminId, requester) {
        const effectiveAdminId = requester?.role === user_entity_1.UserRole.SUB_ADMIN ? requester.id : adminId;
        return this.subAdminService.listActivityLogs(+page, +limit, effectiveAdminId);
    }
    async getPermissions(userId, requester) {
        return this.subAdminService.getPermissions(userId, requester);
    }
    async updatePermissions(userId, dto, requester) {
        return this.subAdminService.updatePermissions(userId, dto, requester);
    }
    async listReports(page = 1, limit = 20, requester) {
        return this.subAdminService.listReports(requester, +page, +limit);
    }
    async generateReport(dto, requester) {
        return this.subAdminService.generateReport(requester, dto);
    }
    async exportActivityLog(requester) {
        return this.subAdminService.exportActivityLog(requester);
    }
};
exports.SubAdminController = SubAdminController;
__decorate([
    (0, common_1.Get)('merchants/pending'),
    (0, swagger_1.ApiOperation)({ summary: 'List pending merchants awaiting approval' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of pending merchants with user details',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_pending_merchants_dto_1.ListPendingMerchantsDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "listPendingMerchants", null);
__decorate([
    (0, common_1.Get)('merchants/pending/count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get total count of pending merchants' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Number of pending merchants awaiting approval',
        schema: { example: { count: 5 } },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "getPendingMerchantsCount", null);
__decorate([
    (0, common_1.Get)('merchants/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get merchant detail for moderation review' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Merchant details with business information',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "getMerchantDetail", null);
__decorate([
    (0, common_1.Patch)('merchants/:id/approve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a pending merchant' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Merchant approved successfully',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, approve_merchant_dto_1.ApproveMerchantDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "approveMerchant", null);
__decorate([
    (0, common_1.Patch)('merchants/:id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a pending merchant' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Merchant rejected successfully',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, reject_merchant_dto_1.RejectMerchantDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "rejectMerchant", null);
__decorate([
    (0, common_1.Get)('moderation/flagged-reviews'),
    (0, swagger_1.ApiOperation)({ summary: 'List flagged reviews awaiting moderation' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of flagged reviews with product and user details',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_flagged_reviews_dto_1.ListFlaggedReviewsDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "listFlaggedReviews", null);
__decorate([
    (0, common_1.Get)('moderation/flagged-reviews/count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get total count of flagged reviews' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Number of flagged reviews awaiting moderation',
        schema: { example: { count: 3 } },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "getFlaggedReviewsCount", null);
__decorate([
    (0, common_1.Patch)('moderation/reviews/:id/action'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Take moderation action on a flagged review' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Review moderation action completed',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, review_moderation_dto_1.ReviewModerationDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "moderateReview", null);
__decorate([
    (0, common_1.Get)('moderation/flagged-content'),
    (0, swagger_1.ApiOperation)({ summary: 'List flagged content (products) awaiting moderation' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Paginated list of flagged products with merchant and category details',
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_flagged_content_dto_1.ListFlaggedContentDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "listFlaggedContent", null);
__decorate([
    (0, common_1.Get)('moderation/flagged-content/count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get total count of flagged content' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Number of flagged products awaiting moderation',
        schema: { example: { count: 8 } },
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "getFlaggedContentCount", null);
__decorate([
    (0, common_1.Patch)('moderation/content/:id/action'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Take moderation action on flagged content (product)' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Content moderation action completed',
    }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, content_moderation_dto_1.ContentModerationDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "moderateContent", null);
__decorate([
    (0, common_1.Get)('users'),
    (0, swagger_1.ApiOperation)({ summary: 'List users for moderation' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_users_dto_1.ListUsersDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/moderate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Warn, suspend, or restore a user account' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_moderation_dto_1.UserModerationDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "moderateUser", null);
__decorate([
    (0, common_1.Get)('disputes'),
    (0, swagger_1.ApiOperation)({ summary: 'List all order disputes' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "listDisputes", null);
__decorate([
    (0, common_1.Get)('disputes/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get dispute details' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "getDispute", null);
__decorate([
    (0, common_1.Patch)('disputes/:id/resolve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resolve an order dispute' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dispute_dto_1.ResolveDisputeDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "resolveDispute", null);
__decorate([
    (0, common_1.Post)('disputes/:id/notes'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Add an internal note to a dispute' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dispute_dto_1.DisputeNoteDto,
        user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "addDisputeNote", null);
__decorate([
    (0, common_1.Get)('activity-logs'),
    (0, swagger_1.ApiOperation)({ summary: 'View admin action logs' }),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('adminId')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "listActivityLogs", null);
__decorate([
    (0, common_1.Get)('permissions/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get permissions for a sub-admin' }),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "getPermissions", null);
__decorate([
    (0, common_1.Patch)('permissions/:userId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update permissions for a sub-admin (Admin only)' }),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "updatePermissions", null);
__decorate([
    (0, common_1.Get)('reports'),
    (0, swagger_1.ApiOperation)({ summary: 'List generated moderation reports' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "listReports", null);
__decorate([
    (0, common_1.Post)('reports'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate a new moderation report' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "generateReport", null);
__decorate([
    (0, common_1.Get)('activity-log/export'),
    (0, swagger_1.ApiOperation)({ summary: 'Export activity logs' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", Promise)
], SubAdminController.prototype, "exportActivityLog", null);
exports.SubAdminController = SubAdminController = __decorate([
    (0, swagger_1.ApiTags)('sub-admin'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN),
    (0, common_1.Controller)('sub-admin'),
    __metadata("design:paramtypes", [sub_admin_service_1.SubAdminService])
], SubAdminController);
//# sourceMappingURL=sub-admin.controller.js.map