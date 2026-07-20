import { Repository, DataSource } from 'typeorm';
import { Cache } from 'cache-manager';
import { Product } from '../database/entities/product.entity';
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
    took: number;
}
export declare class SearchService {
    private readonly productsRepo;
    private readonly categoriesRepo;
    private readonly dataSource;
    private readonly cache;
    private readonly logger;
    private readonly PRICE_RANGES;
    constructor(productsRepo: Repository<Product>, categoriesRepo: Repository<Category>, dataSource: DataSource, cache: Cache);
    search(dto: SearchQueryDto): Promise<SearchResult>;
    autocomplete(q: string, limit?: number, categoryFilter?: string): Promise<string[]>;
    getTrending(limit?: number): Promise<Array<{
        query: string;
        count: number;
    }>>;
    getRelated(productId: string, limit?: number): Promise<Product[]>;
    browseCategory(slug: string, dto: Omit<SearchQueryDto, 'q' | 'category'>): Promise<SearchResult>;
    private buildFacets;
    private getSuggestions;
    private logSearchQuery;
}
