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
exports.MerchantsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const swagger_2 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const merchants_service_1 = require("./merchants.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_entity_1 = require("../database/entities/user.entity");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const multer_config_1 = require("../uploads/multer.config");
class RegisterMerchantDto {
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'Aisha Electronics' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterMerchantDto.prototype, "storeName", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RegisterMerchantDto.prototype, "description", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], RegisterMerchantDto.prototype, "businessInfo", void 0);
class UpdateStoreDto {
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStoreDto.prototype, "storeName", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStoreDto.prototype, "description", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStoreDto.prototype, "logoUrl", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateStoreDto.prototype, "bannerUrl", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], UpdateStoreDto.prototype, "businessInfo", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateStoreDto.prototype, "returnPolicyDays", void 0);
class PayoutRequestDto {
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 150.00 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(20),
    __metadata("design:type", Number)
], PayoutRequestDto.prototype, "amount", void 0);
class ConnectBankAccountDto {
}
__decorate([
    (0, swagger_2.ApiProperty)({ example: 'acct_1NXXXXXXXXXXXXXXXX' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(6, 120),
    __metadata("design:type", String)
], ConnectBankAccountDto.prototype, "stripeAccountId", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'Chase Bank' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConnectBankAccountDto.prototype, "bankName", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: '4291' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(4, 4),
    __metadata("design:type", String)
], ConnectBankAccountDto.prototype, "accountLast4", void 0);
class ConnectStripeOnboardingDto {
}
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'http://localhost:4000/merchant/payouts?stripe_onboarding=refresh' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConnectStripeOnboardingDto.prototype, "refreshUrl", void 0);
__decorate([
    (0, swagger_2.ApiPropertyOptional)({ example: 'http://localhost:4000/merchant/payouts?stripe_onboarding=success' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ConnectStripeOnboardingDto.prototype, "returnUrl", void 0);
let MerchantsController = class MerchantsController {
    constructor(merchantsService, config) {
        this.merchantsService = merchantsService;
        this.config = config;
    }
    findBySlug(slug) { return this.merchantsService.findBySlug(slug); }
    register(user, dto) {
        return this.merchantsService.register(user.id, dto);
    }
    getMyStore(user) { return this.merchantsService.findByUserId(user.id); }
    async updateStore(user, dto, files) {
        const merchant = await this.merchantsService.findByUserId(user.id);
        if (!merchant)
            throw new common_1.NotFoundException('No merchant store found');
        const baseUrl = this.config.get('APP_URL', 'http://localhost:3000');
        if (files?.logo && files.logo.length > 0) {
            const logoUrl = (0, multer_config_1.fileUrl)(baseUrl, 'merchants', files.logo[0].filename);
            dto.logoUrl = logoUrl;
        }
        if (files?.banner && files.banner.length > 0) {
            const bannerUrl = (0, multer_config_1.fileUrl)(baseUrl, 'merchants', files.banner[0].filename);
            dto.bannerUrl = bannerUrl;
        }
        if (dto.storeName === 'undefined')
            dto.storeName = undefined;
        if (dto.description === 'undefined')
            dto.description = undefined;
        if (dto.returnPolicyDays === undefined || dto.returnPolicyDays === null) {
            delete dto.returnPolicyDays;
        }
        return this.merchantsService.updateStore(merchant.id, user.id, dto);
    }
    toggleOnline(user) {
        return this.merchantsService.findByUserId(user.id).then((m) => {
            if (!m)
                throw new common_1.NotFoundException('No merchant store found');
            return this.merchantsService.toggleOnline(m.id, user.id);
        });
    }
    getEarnings(user, period = 'month') {
        return this.merchantsService.findByUserId(user.id).then((m) => {
            if (!m)
                throw new common_1.NotFoundException('No merchant store found');
            return this.merchantsService.getEarnings(m.id, period);
        });
    }
    requestPayout(user, dto) {
        return this.merchantsService.findByUserId(user.id).then((m) => {
            if (!m)
                throw new common_1.NotFoundException('No merchant store found');
            return this.merchantsService.requestPayout(m.id, user.id, dto.amount);
        });
    }
    getPayoutHistory(user, limit = 20) {
        return this.merchantsService.findByUserId(user.id).then((m) => {
            if (!m)
                throw new common_1.NotFoundException('No merchant store found');
            return this.merchantsService.getPayoutHistory(m.id, user.id, +limit);
        });
    }
    createConnectAccount(user, dto = {}) {
        return this.merchantsService.findByUserId(user.id).then((m) => {
            if (!m)
                throw new common_1.NotFoundException('No merchant store found');
            return this.merchantsService.createConnectAccount(m.id, user.id, user.email, {
                refreshUrl: dto.refreshUrl,
                returnUrl: dto.returnUrl,
            });
        });
    }
    connectBankAccount(user, dto) {
        return this.merchantsService.findByUserId(user.id).then((m) => {
            if (!m)
                throw new common_1.NotFoundException('No merchant store found');
            return this.merchantsService.connectBankAccount(m.id, user.id, dto);
        });
    }
    findAll(page = 1, limit = 20, status) {
        return this.merchantsService.findAll(+page, +limit, status);
    }
    findOne(id) { return this.merchantsService.findById(id); }
    approve(id, body) {
        return this.merchantsService.approve(id, body.commissionRate);
    }
    suspend(id, body) {
        return this.merchantsService.suspend(id, body.reason);
    }
    setCommission(id, body) {
        return this.merchantsService.setCommissionRate(id, body.rate);
    }
};
exports.MerchantsController = MerchantsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('store/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get merchant store by slug (public)' }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "findBySlug", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new merchant store' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, RegisterMerchantDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: "Get own merchant store" }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "getMyStore", null);
__decorate([
    (0, common_1.Put)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Update store profile with logo & banner upload' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data', 'application/json'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                storeName: { type: 'string' },
                description: { type: 'string' },
                returnPolicyDays: { type: 'number' },
                businessInfo: { type: 'object' },
                logo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Store logo image file (optional)',
                },
                banner: {
                    type: 'string',
                    format: 'binary',
                    description: 'Store banner image file (optional)',
                },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileFieldsInterceptor)([
        { name: 'logo', maxCount: 1 },
        { name: 'banner', maxCount: 1 },
    ], (0, multer_config_1.multerOptions)('merchants'))),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User,
        UpdateStoreDto, Object]),
    __metadata("design:returntype", Promise)
], MerchantsController.prototype, "updateStore", null);
__decorate([
    (0, common_1.Patch)('me/toggle-online'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle store online / offline status' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "toggleOnline", null);
__decorate([
    (0, common_1.Get)('me/earnings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get earnings dashboard' }),
    (0, swagger_1.ApiQuery)({ name: 'period', enum: ['week', 'month', 'year'], required: false }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Object]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "getEarnings", null);
__decorate([
    (0, common_1.Post)('me/payout'),
    (0, swagger_1.ApiOperation)({ summary: 'Request a payout to connected bank account' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, PayoutRequestDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "requestPayout", null);
__decorate([
    (0, common_1.Get)('me/payout-history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get merchant payout transfer history' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 20 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, Object]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "getPayoutHistory", null);
__decorate([
    (0, common_1.Post)('me/connect-account'),
    (0, swagger_1.ApiOperation)({ summary: 'Create Stripe Connect account (if needed) and return hosted onboarding link' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, ConnectStripeOnboardingDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "createConnectAccount", null);
__decorate([
    (0, common_1.Patch)('me/bank-account'),
    (0, swagger_1.ApiOperation)({ summary: 'Connect or update merchant bank account details' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, ConnectBankAccountDto]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "connectBankAccount", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: list all merchants' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: supporting_entities_1.MerchantStatus, required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: get merchant by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/approve'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: approve a merchant' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)(':id/suspend'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: suspend a merchant' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "suspend", null);
__decorate([
    (0, common_1.Patch)(':id/commission'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Admin: set merchant commission rate' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MerchantsController.prototype, "setCommission", null);
exports.MerchantsController = MerchantsController = __decorate([
    (0, swagger_1.ApiTags)('merchants'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('merchants'),
    __metadata("design:paramtypes", [merchants_service_1.MerchantsService,
        config_1.ConfigService])
], MerchantsController);
//# sourceMappingURL=merchants.controller.js.map