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
exports.ProductsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const products_service_1 = require("./products.service");
const product_query_dto_1 = require("./dto/product-query.dto");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const public_decorator_1 = require("../common/decorators/public.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_entity_1 = require("../database/entities/user.entity");
const multer_config_1 = require("../uploads/multer.config");
let ProductsController = class ProductsController {
    constructor(productsService, config) {
        this.productsService = productsService;
        this.config = config;
    }
    findAll(query) {
        return this.productsService.findAll(query);
    }
    getFeaturedProducts(limit = 12) {
        return this.productsService.getFeaturedProducts(+limit);
    }
    getTrendingProducts(limit = 12) {
        return this.productsService.getTrendingProducts(+limit);
    }
    getCategoryCounts() {
        return this.productsService.getCategoryCounts();
    }
    findBySlug(slug) {
        return this.productsService.findBySlug(slug);
    }
    findMyProducts(user, query) {
        return this.productsService.findByMerchantUser(user.id, query);
    }
    findOne(id) {
        return this.productsService.findOne(id);
    }
    async create(body, user, files) {
        const baseUrl = this.config.get('APP_URL', 'http://localhost:3000');
        let variants = undefined;
        if (body.variants) {
            try {
                variants = JSON.parse(body.variants);
            }
            catch (e) {
                throw new common_1.BadRequestException('Invalid variants JSON format');
            }
        }
        const dto = {
            name: body.name,
            description: body.description,
            price: parseFloat(body.price),
            stock: parseInt(body.stock),
            categoryId: body.categoryId,
            merchantId: body.merchantId,
            comparePrice: body.comparePrice ? parseFloat(body.comparePrice) : undefined,
            sku: body.sku,
            lowStockAt: body.lowStockAt ? parseInt(body.lowStockAt) : 10,
            isFeatured: body.isFeatured === 'true' || body.isFeatured === true,
            variants: variants,
            images: body.images ? (Array.isArray(body.images) ? body.images : [body.images]) : [],
        };
        let allImages = [];
        if (dto.images && Array.isArray(dto.images)) {
            allImages.push(...dto.images);
        }
        if (files && files.length > 0) {
            const uploadedUrls = files.map((f) => (0, multer_config_1.fileUrl)(baseUrl, 'products', f.filename));
            allImages.push(...uploadedUrls);
        }
        dto.images = allImages;
        return this.productsService.create(dto, user);
    }
    async update(id, body, user, files) {
        const baseUrl = this.config.get('APP_URL', 'http://localhost:3000');
        let variants = undefined;
        if (body.variants) {
            try {
                variants = JSON.parse(body.variants);
            }
            catch (e) {
                throw new common_1.BadRequestException('Invalid variants JSON format');
            }
        }
        const dto = {};
        if (body.name)
            dto.name = body.name;
        if (body.description)
            dto.description = body.description;
        if (body.price)
            dto.price = parseFloat(body.price);
        if (body.stock)
            dto.stock = parseInt(body.stock);
        if (body.categoryId)
            dto.categoryId = body.categoryId;
        if (body.merchantId)
            dto.merchantId = body.merchantId;
        if (body.comparePrice)
            dto.comparePrice = parseFloat(body.comparePrice);
        if (body.sku)
            dto.sku = body.sku;
        if (body.lowStockAt)
            dto.lowStockAt = parseInt(body.lowStockAt);
        if (body.isFeatured !== undefined)
            dto.isFeatured = body.isFeatured === 'true' || body.isFeatured === true;
        if (body.status)
            dto.status = body.status;
        if (variants)
            dto.variants = variants;
        if (files && files.length > 0) {
            const uploadedUrls = files.map((f) => (0, multer_config_1.fileUrl)(baseUrl, 'products', f.filename));
            const existingUrls = body.images ? (Array.isArray(body.images) ? body.images : [body.images]) : [];
            dto.images = [...existingUrls, ...uploadedUrls];
        }
        return this.productsService.update(id, dto, user);
    }
    restock(id, body, user) {
        return this.productsService.restock(id, body.quantity, user);
    }
    remove(id, user) {
        return this.productsService.remove(id, user);
    }
    flag(id) {
        return this.productsService.flag(id);
    }
};
exports.ProductsController = ProductsController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List products with filters & pagination' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_query_dto_1.ProductQueryDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findAll", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('featured'),
    (0, swagger_1.ApiOperation)({ summary: 'Get featured products' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "getFeaturedProducts", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('trending'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trending products (most sold in last 7 days)' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "getTrendingProducts", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('category-counts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get active product counts per category slug' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "getCategoryCounts", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('slug/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Get product by slug' }),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findBySlug", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('merchant/me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current merchant products' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User, product_query_dto_1.ProductQueryDto]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findMyProducts", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get product by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "findOne", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.MERCHANT, user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new product with optional image upload' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                price: { type: 'number' },
                stock: { type: 'number' },
                categoryId: { type: 'string' },
                merchantId: { type: 'string' },
                comparePrice: { type: 'number' },
                sku: { type: 'string' },
                lowStockAt: { type: 'number' },
                isFeatured: { type: 'boolean' },
                variants: { type: 'string', description: 'JSON string of variants array' },
                images: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                },
            },
        },
    }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10, (0, multer_config_1.multerOptions)('products'))),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User, Array]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "create", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.MERCHANT, user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN),
    (0, common_1.Put)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update product (optionally replace/add images)' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('images', 10, (0, multer_config_1.multerOptions)('products'))),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __param(3, (0, common_1.UploadedFiles)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, user_entity_1.User, Array]),
    __metadata("design:returntype", Promise)
], ProductsController.prototype, "update", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.MERCHANT, user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN),
    (0, common_1.Put)(':id/restock'),
    (0, swagger_1.ApiOperation)({ summary: 'Update product stock level' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "restock", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.MERCHANT, user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN),
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete product (soft delete)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/flag'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Flag product for moderation' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ProductsController.prototype, "flag", null);
exports.ProductsController = ProductsController = __decorate([
    (0, swagger_1.ApiTags)('products'),
    (0, common_1.Controller)('products'),
    __metadata("design:paramtypes", [products_service_1.ProductsService,
        config_1.ConfigService])
], ProductsController);
//# sourceMappingURL=products.controller.js.map