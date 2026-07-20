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
var SearchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
const product_entity_1 = require("../database/entities/product.entity");
const supporting_entities_1 = require("../database/entities/supporting.entities");
let SearchService = SearchService_1 = class SearchService {
    constructor(productsRepo, categoriesRepo, dataSource, cache) {
        this.productsRepo = productsRepo;
        this.categoriesRepo = categoriesRepo;
        this.dataSource = dataSource;
        this.cache = cache;
        this.logger = new common_1.Logger(SearchService_1.name);
        this.PRICE_RANGES = [
            { label: 'Under $25', min: 0, max: 25 },
            { label: '$25 – $50', min: 25, max: 50 },
            { label: '$50 – $100', min: 50, max: 100 },
            { label: '$100 – $200', min: 100, max: 200 },
            { label: 'Over $200', min: 200, max: null },
        ];
    }
    async search(dto) {
        const start = Date.now();
        const { q = '', page = 1, limit = 20, category, minPrice, maxPrice, minRating, minDiscount, inStock, merchant, sort = 'relevance', featured, } = dto;
        const cacheKey = `search:${JSON.stringify(dto)}`;
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const qb = this.productsRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.merchant', 'm')
            .leftJoinAndSelect('p.category', 'c')
            .where('p.status = :status', { status: product_entity_1.ProductStatus.ACTIVE })
            .andWhere('p.deleted_at IS NULL');
        if (q.trim()) {
            const escaped = q.trim().replace(/['"\\]/g, '');
            qb.andWhere(`to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', :query)`, { query: escaped });
            qb.addSelect(`ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', :query))`, 'relevance').setParameter('query', q.trim());
        }
        if (category)
            qb.andWhere('c.slug = :category', { category });
        if (merchant)
            qb.andWhere('p.merchant_id = :merchant', { merchant });
        if (featured)
            qb.andWhere('p.is_featured = true');
        if (inStock)
            qb.andWhere('p.stock > 0');
        if (minPrice != null)
            qb.andWhere('p.price >= :minPrice', { minPrice });
        if (maxPrice != null)
            qb.andWhere('p.price <= :maxPrice', { maxPrice });
        if (minRating != null)
            qb.andWhere('p.avg_rating >= :minRating', { minRating });
        if (minDiscount != null) {
            qb.andWhere('p.compare_price IS NOT NULL')
                .andWhere('p.compare_price > p.price')
                .andWhere('((p.compare_price - p.price) / NULLIF(p.compare_price, 0)) * 100 >= :minDiscount', { minDiscount });
        }
        switch (sort) {
            case 'relevance':
                q.trim() ? qb.orderBy('relevance', 'DESC') : qb.orderBy('p.totalSold', 'DESC');
                break;
            case 'popular':
                qb.orderBy('p.totalSold', 'DESC');
                break;
            case 'newest':
                qb.orderBy('p.createdAt', 'DESC');
                break;
            case 'price_asc':
                qb.orderBy('p.price', 'ASC');
                break;
            case 'price_desc':
                qb.orderBy('p.price', 'DESC');
                break;
            case 'rating':
                qb.orderBy('p.avgRating', 'DESC');
                break;
            case 'discount':
                qb.orderBy('(p.compare_price - p.price)', 'DESC');
                break;
            default: qb.orderBy('p.createdAt', 'DESC');
        }
        qb.skip((page - 1) * limit).take(Math.min(limit, 100));
        const [products, total] = await qb.getManyAndCount();
        let categories = [];
        if (q.trim()) {
            categories = await this.categoriesRepo
                .createQueryBuilder('c')
                .where('LOWER(c.name) LIKE LOWER(:q)', { q: `%${q}%` })
                .andWhere('c.is_active = true')
                .take(5)
                .getMany();
        }
        const facets = await this.buildFacets(dto);
        const suggestions = q.trim() ? await this.getSuggestions(q) : [];
        if (q.trim())
            this.logSearchQuery(q, total).catch(() => { });
        const result = {
            products,
            categories,
            suggestions,
            total,
            facets,
            meta: {
                query: q,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
                took: Date.now() - start,
            },
        };
        await this.cache.set(cacheKey, result, 60_000);
        return result;
    }
    async autocomplete(q, limit = 8, categoryFilter = '') {
        if (!q || q.length < 2)
            return [];
        const cacheKey = `autocomplete:${q.toLowerCase()}:${categoryFilter.toLowerCase() || 'all'}`;
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        let results = [];
        try {
            let query = this.productsRepo
                .createQueryBuilder('p')
                .select('p.name', 'name')
                .addSelect('MAX(p.totalSold)', 'popularity')
                .where('p.status = :status', { status: product_entity_1.ProductStatus.ACTIVE })
                .andWhere('p.deleted_at IS NULL');
            if (categoryFilter && categoryFilter.trim()) {
                query = query
                    .innerJoin('p.category', 'c')
                    .andWhere('LOWER(c.name) = LOWER(:category)', { category: categoryFilter.trim() });
            }
            results = await query
                .andWhere(`(LOWER(p.name) LIKE LOWER(:prefix) OR similarity(p.name, :q) > 0.2)`, { prefix: `${q}%`, q })
                .groupBy('p.name')
                .orderBy('popularity', 'DESC')
                .limit(limit)
                .getRawMany();
        }
        catch (error) {
            this.logger.warn('pg_trgm similarity unavailable, falling back to prefix-only autocomplete');
            let query = this.productsRepo
                .createQueryBuilder('p')
                .select('p.name', 'name')
                .addSelect('MAX(p.totalSold)', 'popularity')
                .where('p.status = :status', { status: product_entity_1.ProductStatus.ACTIVE })
                .andWhere('p.deleted_at IS NULL');
            if (categoryFilter && categoryFilter.trim()) {
                query = query
                    .innerJoin('p.category', 'c')
                    .andWhere('LOWER(c.name) = LOWER(:category)', { category: categoryFilter.trim() });
            }
            results = await query
                .andWhere('LOWER(p.name) LIKE LOWER(:prefix)', { prefix: `${q}%` })
                .groupBy('p.name')
                .orderBy('popularity', 'DESC')
                .limit(limit)
                .getRawMany();
        }
        const suggestions = results.map((r) => r.name);
        if (!categoryFilter || !categoryFilter.trim()) {
            const catResults = await this.categoriesRepo
                .createQueryBuilder('c')
                .select('c.name', 'name')
                .where('LOWER(c.name) LIKE LOWER(:prefix)', { prefix: `${q}%` })
                .andWhere('c.is_active = true')
                .limit(3)
                .getRawMany();
            const combined = [
                ...new Set([...suggestions, ...catResults.map((c) => c.name)]),
            ].slice(0, limit);
            await this.cache.set(cacheKey, combined, 30_000);
            return combined;
        }
        await this.cache.set(cacheKey, suggestions, 30_000);
        return suggestions.slice(0, limit);
    }
    async getTrending(limit = 10) {
        const cacheKey = 'search:trending';
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const results = await this.dataSource.query(`
      SELECT query, COUNT(*) as count
      FROM search_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND results_count > 0
      GROUP BY query
      ORDER BY count DESC
      LIMIT $1
    `, [limit]).catch(() => []);
        const trending = results.map((r) => ({
            query: r.query,
            count: parseInt(r.count, 10),
        }));
        await this.cache.set(cacheKey, trending, 300_000);
        return trending;
    }
    async getRelated(productId, limit = 8) {
        const cacheKey = `related:${productId}`;
        const cached = await this.cache.get(cacheKey);
        if (cached)
            return cached;
        const product = await this.productsRepo.findOne({
            where: { id: productId },
            relations: ['category'],
        });
        if (!product)
            return [];
        const related = await this.productsRepo
            .createQueryBuilder('p')
            .leftJoinAndSelect('p.merchant', 'm')
            .where('p.category_id = :categoryId', { categoryId: product.categoryId })
            .andWhere('p.id != :productId', { productId })
            .andWhere('p.status = :status', { status: product_entity_1.ProductStatus.ACTIVE })
            .andWhere('p.deleted_at IS NULL')
            .orderBy('p.totalSold', 'DESC')
            .addOrderBy('p.avgRating', 'DESC')
            .take(limit)
            .getMany();
        await this.cache.set(cacheKey, related, 120_000);
        return related;
    }
    async browseCategory(slug, dto) {
        return this.search({ ...dto, q: '', category: slug });
    }
    async buildFacets(dto) {
        const { q = '', merchant } = dto;
        const baseWhere = `
      p.status = 'active'
      AND p."deleted_at" IS NULL
      ${q.trim() ? `AND to_tsvector('english', p.name) @@ plainto_tsquery('english', '${q.replace(/'/g, "''")}')` : ''}
      ${merchant ? `AND p.merchant_id = '${merchant}'` : ''}
    `;
        const [categoryFacets, priceFacets, ratingFacets] = await Promise.all([
            this.dataSource.query(`
        SELECT c.id, c.name as label, COUNT(p.id)::int as count
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE ${baseWhere}
        GROUP BY c.id, c.name
        ORDER BY count DESC
        LIMIT 12
      `),
            Promise.all(this.PRICE_RANGES.map(async (range) => {
                const [{ count }] = await this.dataSource.query(`
            SELECT COUNT(*)::int as count FROM products p
            WHERE ${baseWhere}
              AND p.price >= ${range.min}
              ${range.max !== null ? `AND p.price < ${range.max}` : ''}
          `);
                return { ...range, count: parseInt(count, 10) };
            })),
            this.dataSource.query(`
        SELECT
          CASE
            WHEN p.avg_rating >= 4.5 THEN '4.5+'
            WHEN p.avg_rating >= 4.0 THEN '4.0+'
            WHEN p.avg_rating >= 3.5 THEN '3.5+'
            ELSE 'Under 3.5'
          END as label,
          CASE
            WHEN p.avg_rating >= 4.5 THEN '4.5'
            WHEN p.avg_rating >= 4.0 THEN '4.0'
            WHEN p.avg_rating >= 3.5 THEN '3.5'
            ELSE '0'
          END as id,
          COUNT(*)::int as count
        FROM products p
        WHERE ${baseWhere}
        GROUP BY 1, 2
        ORDER BY id DESC
      `),
        ]);
        return {
            categories: categoryFacets.map((r) => ({
                id: r.id, label: r.label, count: r.count,
            })),
            priceRanges: priceFacets,
            ratings: ratingFacets.map((r) => ({
                id: r.id, label: r.label, count: r.count,
            })),
            merchants: [],
        };
    }
    async getSuggestions(q) {
        const results = await this.productsRepo
            .createQueryBuilder('p')
            .select('p.name', 'name')
            .where('p.status = :status', { status: product_entity_1.ProductStatus.ACTIVE })
            .andWhere('LOWER(p.name) LIKE LOWER(:prefix)', { prefix: `${q}%` })
            .orderBy('p.totalSold', 'DESC')
            .limit(5)
            .getRawMany();
        return results.map((r) => r.name);
    }
    async logSearchQuery(query, resultsCount) {
        try {
            await this.dataSource.query(`INSERT INTO search_logs (id, query, results_count, created_at)
         VALUES (gen_random_uuid(), $1, $2, NOW())`, [query.toLowerCase().trim(), resultsCount]);
        }
        catch {
        }
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = SearchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(supporting_entities_1.Category)),
    __param(3, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource, Object])
], SearchService);
//# sourceMappingURL=search.service.js.map