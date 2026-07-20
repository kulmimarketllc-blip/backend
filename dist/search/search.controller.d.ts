import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
    search(dto: SearchQueryDto): Promise<import("./search.service").SearchResult>;
    autocomplete(q?: string, limit?: number, category?: string): Promise<string[]>;
    getTrending(limit?: number): Promise<{
        query: string;
        count: number;
    }[]>;
    getRelated(productId: string, limit?: number): Promise<import("../database/entities/product.entity").Product[]>;
    browseCategory(slug: string, dto: SearchQueryDto): Promise<import("./search.service").SearchResult>;
}
