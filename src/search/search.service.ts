import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

import { Product, ProductStatus } from '../database/entities/product.entity';
import { Category } from '../database/entities/supporting.entities';
import { SearchQueryDto } from './dto/search-query.dto';

export interface SearchResult {
  products: Product[];
  categories: Category[];
  suggestions: string[];
  total: number;
  facets: SearchFacets;
  meta: SearchMeta;
}

export interface SearchFacets {
  categories: FacetItem[];
  priceRanges: PriceRangeFacet[];
  ratings: FacetItem[];
  merchants: FacetItem[];
}

export interface FacetItem {
  id: string;
  label: string;
  count: number;
}

export interface PriceRangeFacet {
  label: string;
  min: number;
  max: number | null;
  count: number;
}

export interface SearchMeta {
  query: string;
  total: number;
  page: number;
  limit: number;
  pages: number;
  took: number;  // ms
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  // Price range buckets for facets
  private readonly PRICE_RANGES = [
    { label: 'Under $25',    min: 0,   max: 25   },
    { label: '$25 – $50',    min: 25,  max: 50   },
    { label: '$50 – $100',   min: 50,  max: 100  },
    { label: '$100 – $200',  min: 100, max: 200  },
    { label: 'Over $200',    min: 200, max: null },
  ];

  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoriesRepo: Repository<Category>,

    private readonly dataSource: DataSource,

    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  // ── Main Search ───────────────────────────────
  async search(dto: SearchQueryDto): Promise<SearchResult> {
    const start = Date.now();
    const {
      q = '', page = 1, limit = 20,
      category, minPrice, maxPrice,
      minRating, minDiscount, inStock, merchant,
      sort = 'relevance', featured,
    } = dto;

    const cacheKey = `search:${JSON.stringify(dto)}`;
    const cached = await this.cache.get<SearchResult>(cacheKey);
    if (cached) return cached;

    const qb = this.productsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.merchant', 'm')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p.deleted_at IS NULL');

    // ── Full-text search (PostgreSQL ts_rank) ──
    if (q.trim()) {
      const escaped = q.trim().replace(/['"\\]/g, '');
      qb.andWhere(
        `to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', :query)`,
        { query: escaped },
      );
      // Add relevance score for sorting
      qb.addSelect(
        `ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', :query))`,
        'relevance',
      ).setParameter('query', q.trim());
    }

    // ── Filters ──
    if (category)           qb.andWhere('c.slug = :category',    { category });
    if (merchant)           qb.andWhere('p.merchant_id = :merchant', { merchant });
    if (featured)           qb.andWhere('p.is_featured = true');
    if (inStock)            qb.andWhere('p.stock > 0');
    if (minPrice != null)   qb.andWhere('p.price >= :minPrice',  { minPrice });
    if (maxPrice != null)   qb.andWhere('p.price <= :maxPrice',  { maxPrice });
    if (minRating != null)  qb.andWhere('p.avg_rating >= :minRating', { minRating });
    if (minDiscount != null) {
      qb.andWhere('p.compare_price IS NOT NULL')
        .andWhere('p.compare_price > p.price')
        .andWhere('((p.compare_price - p.price) / NULLIF(p.compare_price, 0)) * 100 >= :minDiscount', { minDiscount });
    }

    // ── Sorting ──
    switch (sort) {
      case 'relevance':   q.trim() ? qb.orderBy('relevance', 'DESC') : qb.orderBy('p.totalSold', 'DESC'); break;
      case 'popular':     qb.orderBy('p.totalSold', 'DESC');   break;
      case 'newest':      qb.orderBy('p.createdAt', 'DESC');   break;
      case 'price_asc':   qb.orderBy('p.price', 'ASC');        break;
      case 'price_desc':  qb.orderBy('p.price', 'DESC');       break;
      case 'rating':      qb.orderBy('p.avgRating', 'DESC');   break;
      case 'discount':    qb.orderBy('(p.compare_price - p.price)', 'DESC'); break;
      default:            qb.orderBy('p.createdAt', 'DESC');
    }

    qb.skip((page - 1) * limit).take(Math.min(limit, 100));

    const [products, total] = await qb.getManyAndCount();

    // ── Category suggestions (top-level matches) ──
    let categories: Category[] = [];
    if (q.trim()) {
      categories = await this.categoriesRepo
        .createQueryBuilder('c')
        .where('LOWER(c.name) LIKE LOWER(:q)', { q: `%${q}%` })
        .andWhere('c.is_active = true')
        .take(5)
        .getMany();
    }

    // ── Facets (parallel) ──
    const facets = await this.buildFacets(dto);

    // ── Suggestions ──
    const suggestions = q.trim() ? await this.getSuggestions(q) : [];

    // ── Log search for analytics ──
    if (q.trim()) this.logSearchQuery(q, total).catch(() => {});

    const result: SearchResult = {
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

    // Cache for 60 seconds
    await this.cache.set(cacheKey, result, 60_000);
    return result;
  }

  // ── Autocomplete ──────────────────────────────
  async autocomplete(q: string, limit = 8, categoryFilter = ''): Promise<string[]> {
    if (!q || q.length < 2) return [];

    const cacheKey = `autocomplete:${q.toLowerCase()}:${categoryFilter.toLowerCase() || 'all'}`;
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) return cached;

    let results: Array<{ name: string }> = [];

    try {
      // Prefer pg_trgm similarity when extension is available.
      let query = this.productsRepo
        .createQueryBuilder('p')
        .select('p.name', 'name')
        .addSelect('MAX(p.totalSold)', 'popularity')
        .where('p.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('p.deleted_at IS NULL');

      // Add category filter if provided
      if (categoryFilter && categoryFilter.trim()) {
        query = query
          .innerJoin('p.category', 'c')
          .andWhere('LOWER(c.name) = LOWER(:category)', { category: categoryFilter.trim() });
      }

      results = await query
        .andWhere(
          `(LOWER(p.name) LIKE LOWER(:prefix) OR similarity(p.name, :q) > 0.2)`,
          { prefix: `${q}%`, q },
        )
        .groupBy('p.name')
        .orderBy('popularity', 'DESC')
        .limit(limit)
        .getRawMany();
    } catch (error) {
      this.logger.warn('pg_trgm similarity unavailable, falling back to prefix-only autocomplete');
      // Rebuild query without similarity function
      let query = this.productsRepo
        .createQueryBuilder('p')
        .select('p.name', 'name')
        .addSelect('MAX(p.totalSold)', 'popularity')
        .where('p.status = :status', { status: ProductStatus.ACTIVE })
        .andWhere('p.deleted_at IS NULL');

      // Add category filter if provided
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

    const suggestions = results.map((r) => r.name as string);

    // Add category matches (only if no specific category filter is applied)
    if (!categoryFilter || !categoryFilter.trim()) {
      const catResults = await this.categoriesRepo
        .createQueryBuilder('c')
        .select('c.name', 'name')
        .where('LOWER(c.name) LIKE LOWER(:prefix)', { prefix: `${q}%` })
        .andWhere('c.is_active = true')
        .limit(3)
        .getRawMany();

      const combined = [
        ...new Set([...suggestions, ...catResults.map((c) => c.name as string)]),
      ].slice(0, limit);

      await this.cache.set(cacheKey, combined, 30_000); // 30s cache
      return combined;
    }

    await this.cache.set(cacheKey, suggestions, 30_000); // 30s cache
    return suggestions.slice(0, limit);
  }

  // ── Trending Searches ─────────────────────────
  async getTrending(limit = 10): Promise<Array<{ query: string; count: number }>> {
    const cacheKey = 'search:trending';
    const cached = await this.cache.get<Array<{ query: string; count: number }>>(cacheKey);
    if (cached) return cached;

    // Read from search_logs table
    const results = await this.dataSource.query(`
      SELECT query, COUNT(*) as count
      FROM search_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND results_count > 0
      GROUP BY query
      ORDER BY count DESC
      LIMIT $1
    `, [limit]).catch(() => []);

    const trending = results.map((r: any) => ({
      query: r.query as string,
      count: parseInt(r.count, 10),
    }));

    await this.cache.set(cacheKey, trending, 300_000); // 5 min cache
    return trending;
  }

  // ── Related Products ──────────────────────────
  async getRelated(productId: string, limit = 8): Promise<Product[]> {
    const cacheKey = `related:${productId}`;
    const cached = await this.cache.get<Product[]>(cacheKey);
    if (cached) return cached;

    const product = await this.productsRepo.findOne({
      where: { id: productId },
      relations: ['category'],
    });
    if (!product) return [];

    // Find products in same category, sorted by popularity, exclude current
    const related = await this.productsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.merchant', 'm')
      .where('p.category_id = :categoryId', { categoryId: product.categoryId })
      .andWhere('p.id != :productId', { productId })
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p.deleted_at IS NULL')
      .orderBy('p.totalSold', 'DESC')
      .addOrderBy('p.avgRating', 'DESC')
      .take(limit)
      .getMany();

    await this.cache.set(cacheKey, related, 120_000); // 2 min
    return related;
  }

  // ── Browse by Category ────────────────────────
  async browseCategory(slug: string, dto: Omit<SearchQueryDto, 'q' | 'category'>) {
    return this.search({ ...dto, q: '', category: slug });
  }

  // ── Private: Build Facets ─────────────────────
  private async buildFacets(dto: SearchQueryDto): Promise<SearchFacets> {
    const { q = '', merchant } = dto;

    // Base conditions shared across all facet queries
    const baseWhere = `
      p.status = 'active'
      AND p."deleted_at" IS NULL
      ${q.trim() ? `AND to_tsvector('english', p.name) @@ plainto_tsquery('english', '${q.replace(/'/g, "''")}')` : ''}
      ${merchant ? `AND p.merchant_id = '${merchant}'` : ''}
    `;

    const [categoryFacets, priceFacets, ratingFacets] = await Promise.all([
      // Category counts
      this.dataSource.query(`
        SELECT c.id, c.name as label, COUNT(p.id)::int as count
        FROM products p
        JOIN categories c ON c.id = p.category_id
        WHERE ${baseWhere}
        GROUP BY c.id, c.name
        ORDER BY count DESC
        LIMIT 12
      `),

      // Price range counts
      Promise.all(
        this.PRICE_RANGES.map(async (range) => {
          const [{ count }] = await this.dataSource.query(`
            SELECT COUNT(*)::int as count FROM products p
            WHERE ${baseWhere}
              AND p.price >= ${range.min}
              ${range.max !== null ? `AND p.price < ${range.max}` : ''}
          `);
          return { ...range, count: parseInt(count, 10) };
        }),
      ),

      // Rating buckets
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
      categories: categoryFacets.map((r: any) => ({
        id: r.id, label: r.label, count: r.count,
      })),
      priceRanges: priceFacets,
      ratings: ratingFacets.map((r: any) => ({
        id: r.id, label: r.label, count: r.count,
      })),
      merchants: [],  // populated via separate endpoint if needed
    };
  }

  // ── Private: Suggestions from similar products ─
  private async getSuggestions(q: string): Promise<string[]> {
    const results = await this.productsRepo
      .createQueryBuilder('p')
      .select('p.name', 'name')
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('LOWER(p.name) LIKE LOWER(:prefix)', { prefix: `${q}%` })
      .orderBy('p.totalSold', 'DESC')
      .limit(5)
      .getRawMany();

    return results.map((r) => r.name as string);
  }

  // ── Private: Log search query for analytics ───
  private async logSearchQuery(query: string, resultsCount: number): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO search_logs (id, query, results_count, created_at)
         VALUES (gen_random_uuid(), $1, $2, NOW())`,
        [query.toLowerCase().trim(), resultsCount],
      );
    } catch {
      // Non-critical — silently ignore if table doesn't exist yet
    }
  }
}
