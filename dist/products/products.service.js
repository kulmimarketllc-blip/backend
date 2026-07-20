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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ProductsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
const slugify_1 = __importDefault(require("slugify"));
const ulid_1 = require("ulid");
const product_entity_1 = require("../database/entities/product.entity");
const notification_entity_1 = require("../database/entities/notification.entity");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const user_entity_1 = require("../database/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
let ProductsService = ProductsService_1 = class ProductsService {
    constructor(productsRepo, merchantRepo, categoryRepo, notifications, cache) {
        this.productsRepo = productsRepo;
        this.merchantRepo = merchantRepo;
        this.categoryRepo = categoryRepo;
        this.notifications = notifications;
        this.cache = cache;
        this.logger = new common_1.Logger(ProductsService_1.name);
        this.CACHE_TTL = 60000;
    }
    async findAll(query) {
        const { page = 1, limit = 200, q, category, merchant, minPrice, maxPrice, inStock, sort = 'newest', featured, } = query;
        const where = {
            status: product_entity_1.ProductStatus.ACTIVE,
        };
        if (category)
            where.categoryId = category;
        if (merchant)
            where.merchantId = merchant;
        if (featured)
            where.isFeatured = true;
        if (inStock)
            where.stock = (0, typeorm_2.MoreThanOrEqual)(1);
        if (q)
            where.name = (0, typeorm_2.ILike)(`%${q}%`);
        if (minPrice !== undefined && maxPrice !== undefined) {
            where.price = (0, typeorm_2.Between)(minPrice, maxPrice);
        }
        else if (minPrice !== undefined) {
            where.price = (0, typeorm_2.MoreThanOrEqual)(minPrice);
        }
        else if (maxPrice !== undefined) {
            where.price = (0, typeorm_2.LessThanOrEqual)(maxPrice);
        }
        const orderMap = {
            newest: { createdAt: 'DESC' },
            popular: { totalSold: 'DESC' },
            price_asc: { price: 'ASC' },
            price_desc: { price: 'DESC' },
            rating: { avgRating: 'DESC' },
        };
        const [data, total] = await this.productsRepo.findAndCount({
            where,
            order: orderMap[sort] ?? { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: Math.min(limit, 100),
            relations: ['merchant', 'category'],
        });
        return {
            data,
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        };
    }
    async findOne(id) {
        const cacheKey = `product:${id}`;
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const product = await this.productsRepo.findOne({
            where: { id },
            relations: ['merchant', 'category', 'reviews'],
        });
        if (!product)
            throw new common_1.NotFoundException(`Product ${id} not found`);
        await this.cache.set(cacheKey, product, this.CACHE_TTL);
        return product;
    }
    async findBySlug(slug) {
        const product = await this.productsRepo.findOne({
            where: { slug, status: product_entity_1.ProductStatus.ACTIVE },
            relations: ['merchant', 'category'],
        });
        if (!product)
            throw new common_1.NotFoundException(`Product "${slug}" not found`);
        return product;
    }
    async findByMerchantUser(userId, query) {
        const merchant = await this.merchantRepo.findOne({
            where: { userId },
            select: { id: true },
        });
        if (!merchant) {
            throw new common_1.NotFoundException('No merchant store found for this user');
        }
        const { page = 1, limit = 20, q, category, minPrice, maxPrice, inStock, sort = 'newest' } = query;
        const where = { merchantId: merchant.id };
        if (category)
            where.categoryId = category;
        if (inStock)
            where.stock = (0, typeorm_2.MoreThanOrEqual)(1);
        if (q)
            where.name = (0, typeorm_2.ILike)(`%${q}%`);
        if (minPrice !== undefined && maxPrice !== undefined) {
            where.price = (0, typeorm_2.Between)(minPrice, maxPrice);
        }
        else if (minPrice !== undefined) {
            where.price = (0, typeorm_2.MoreThanOrEqual)(minPrice);
        }
        else if (maxPrice !== undefined) {
            where.price = (0, typeorm_2.LessThanOrEqual)(maxPrice);
        }
        const orderMap = {
            newest: { createdAt: 'DESC' },
            popular: { totalSold: 'DESC' },
            price_asc: { price: 'ASC' },
            price_desc: { price: 'DESC' },
            rating: { avgRating: 'DESC' },
        };
        const [data, total] = await this.productsRepo.findAndCount({
            where,
            order: orderMap[sort] ?? { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: Math.min(limit, 100),
            relations: ['merchant', 'category'],
        });
        return {
            data,
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        };
    }
    async resolveCategoryId(identifier) {
        const isUlidFormat = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(identifier);
        let category = null;
        if (isUlidFormat) {
            category = await this.categoryRepo.findOne({
                where: { id: identifier },
            });
        }
        if (!category) {
            category = await this.categoryRepo.findOne({
                where: { slug: identifier.toLowerCase() },
            });
        }
        if (!category) {
            category = await this.categoryRepo.findOne({
                where: { name: (0, typeorm_2.ILike)(identifier) },
            });
        }
        if (!category) {
            const availableCategories = await this.categoryRepo.find({
                select: ['id', 'name', 'slug'],
                take: 10,
            });
            const availableList = availableCategories
                .map(c => `"${c.slug}" (${c.name})`)
                .join(', ');
            throw new common_1.BadRequestException(`Category not found with identifier: "${identifier}". ` +
                `Available categories: ${availableList || 'No categories found'}`);
        }
        return category.id;
    }
    async create(dto, user) {
        const isPlatformAdmin = [user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN].includes(user.role);
        let resolvedMerchantId = dto.merchantId;
        if (!isPlatformAdmin) {
            const merchant = await this.merchantRepo.findOne({
                where: { userId: user.id },
                select: { id: true, status: true },
            });
            if (!merchant) {
                throw new common_1.ForbiddenException('No merchant store found for this user');
            }
            if (merchant.status !== supporting_entities_1.MerchantStatus.APPROVED) {
                throw new common_1.ForbiddenException('Your merchant account must be approved before creating products');
            }
            resolvedMerchantId = merchant.id;
        }
        if (!resolvedMerchantId) {
            throw new common_1.BadRequestException('merchantId is required');
        }
        const resolvedCategoryId = await this.resolveCategoryId(dto.categoryId);
        const slug = await this.generateSlug(dto.name);
        const images = dto.images && Array.isArray(dto.images) ? dto.images : [];
        const productData = {
            ...dto,
            id: (0, ulid_1.ulid)(),
            slug,
            merchantId: resolvedMerchantId,
            categoryId: resolvedCategoryId,
            images: images,
            status: isPlatformAdmin ? product_entity_1.ProductStatus.ACTIVE : product_entity_1.ProductStatus.PENDING_REVIEW,
        };
        const product = this.productsRepo.create(productData);
        try {
            const saved = await this.productsRepo.save(product);
            this.logger.log(`Product created: ${saved.id} by user ${user.id}`);
            return saved;
        }
        catch (error) {
            if (error.code === '23505') {
                throw new common_1.ConflictException('A product with this name or SKU already exists');
            }
            if (error.code === '23503') {
                throw new common_1.BadRequestException('Invalid merchantId provided');
            }
            this.logger.error(`Error creating product: ${error.message}`);
            throw error;
        }
    }
    async update(id, dto, user) {
        const product = await this.findOne(id);
        const isPlatformAdmin = [user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN].includes(user.role);
        if (!isPlatformAdmin) {
            const merchant = await this.merchantRepo.findOne({
                where: { userId: user.id },
                select: { id: true },
            });
            if (product.merchantId !== merchant?.id) {
                throw new common_1.ForbiddenException('You do not own this product');
            }
            if (dto.status !== undefined) {
                throw new common_1.ForbiddenException('Only admins can change product status');
            }
        }
        if (dto.name && dto.name !== product.name) {
            dto.slug = await this.generateSlug(dto.name, id);
        }
        if (dto.categoryId && dto.categoryId !== product.categoryId) {
            dto.categoryId = await this.resolveCategoryId(dto.categoryId);
        }
        if (dto.images !== undefined) {
            dto.images = Array.isArray(dto.images) ? dto.images : [];
        }
        Object.assign(product, dto);
        const updated = await this.productsRepo.save(product);
        await this.cache.del(`product:${id}`);
        return updated;
    }
    async remove(id, user) {
        const product = await this.findOne(id);
        const isPlatformAdmin = [user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN].includes(user.role);
        if (!isPlatformAdmin) {
            const merchant = await this.merchantRepo.findOne({
                where: { userId: user.id },
                select: { id: true },
            });
            if (product.merchantId !== merchant?.id) {
                throw new common_1.ForbiddenException('You do not own this product');
            }
        }
        await this.productsRepo.softDelete(id);
        await this.cache.del(`product:${id}`);
        return { message: 'Product deleted successfully' };
    }
    async restock(id, quantity, user) {
        const product = await this.findOne(id);
        const isPlatformAdmin = [user_entity_1.UserRole.ADMIN, user_entity_1.UserRole.SUB_ADMIN].includes(user.role);
        if (!isPlatformAdmin) {
            const merchant = await this.merchantRepo.findOne({
                where: { userId: user.id },
                select: { id: true },
            });
            if (product.merchantId !== merchant?.id) {
                throw new common_1.ForbiddenException('You do not own this product');
            }
        }
        product.stock += quantity;
        if (product.stock > 0 && product.status === product_entity_1.ProductStatus.OUT_OF_STOCK) {
            product.status = product_entity_1.ProductStatus.ACTIVE;
        }
        const updated = await this.productsRepo.save(product);
        await this.cache.del(`product:${id}`);
        return { id, newStock: updated.stock };
    }
    async getFeaturedProducts(limit = 12) {
        const cacheKey = 'products:featured';
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const products = await this.productsRepo.find({
            where: {
                status: product_entity_1.ProductStatus.ACTIVE,
                isFeatured: true,
            },
            order: { createdAt: 'DESC' },
            take: limit,
            relations: ['merchant', 'category'],
        });
        await this.cache.set(cacheKey, products, this.CACHE_TTL);
        return products;
    }
    async getTrendingProducts(limit = 12) {
        const cacheKey = 'products:trending';
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const products = await this.productsRepo.find({
            where: {
                status: product_entity_1.ProductStatus.ACTIVE,
                updatedAt: (0, typeorm_2.MoreThanOrEqual)(sevenDaysAgo),
            },
            order: { totalSold: 'DESC' },
            take: limit,
            relations: ['merchant', 'category'],
        });
        await this.cache.set(cacheKey, products, 300000);
        return products;
    }
    async getCategoryCounts() {
        const cacheKey = 'products:category-counts';
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const categories = await this.categoryRepo.find({
            relations: ['products'],
        });
        const counts = {};
        for (const category of categories) {
            counts[category.slug] = category.products?.filter(p => p.status === product_entity_1.ProductStatus.ACTIVE).length || 0;
        }
        await this.cache.set(cacheKey, counts, this.CACHE_TTL);
        return counts;
    }
    async flag(id) {
        const product = await this.findOne(id);
        product.flagCount += 1;
        await this.productsRepo.save(product);
        await this.cache.del(`product:${id}`);
        await this.notifications.notifySubAdmins('Product Flagged', `Product "${product.name}" has been flagged for review`, notification_entity_1.NotificationType.SYSTEM, `/admin/products/${id}`);
        return { success: true, flagCount: product.flagCount };
    }
    async generateSlug(name, excludeId) {
        let base = (0, slugify_1.default)(name, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
        let slug = base;
        let counter = 1;
        while (true) {
            const existing = await this.productsRepo.findOne({
                where: { slug },
                withDeleted: true,
            });
            if (!existing || existing.id === excludeId) {
                return slug;
            }
            slug = `${base}-${counter++}`;
        }
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = ProductsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(supporting_entities_1.Merchant)),
    __param(2, (0, typeorm_1.InjectRepository)(supporting_entities_1.Category)),
    __param(4, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService, Object])
], ProductsService);
//# sourceMappingURL=products.service.js.map