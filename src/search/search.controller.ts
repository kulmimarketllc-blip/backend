import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';

import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('search')
@Public()   // All search endpoints are public
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // ── GET /search ───────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'Full-text product search with filters, facets, and suggestions',
    description: `
      Searches products using PostgreSQL full-text search (ts_rank).
      Returns matching products, category suggestions, query suggestions,
      and facets for filters (category, price range, rating).
    `,
  })
  search(@Query() dto: SearchQueryDto) {
    return this.searchService.search(dto);
  }

  // ── GET /search/autocomplete ──────────────────
  @Get('autocomplete')
  @ApiOperation({ summary: 'Get autocomplete suggestions for a search query' })
  @ApiQuery({ name: 'q', required: true, description: 'Partial search term (min 2 chars)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (default 8)' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category name (optional)' })
  autocomplete(
    @Query('q')        q        = '',
    @Query('limit')    limit    = 8,
    @Query('category') category = '',
  ) {
    return this.searchService.autocomplete(q, +limit, category);
  }

  // ── GET /search/trending ──────────────────────
  @Get('trending')
  @ApiOperation({ summary: 'Get trending search queries from the last 24 hours' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTrending(@Query('limit') limit = 10) {
    return this.searchService.getTrending(+limit);
  }

  // ── GET /search/related/:productId ───────────
  @Get('related/:productId')
  @ApiOperation({ summary: 'Get related products for a given product' })
  @ApiParam({ name: 'productId', description: 'Product ID to find related items for' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRelated(
    @Param('productId') productId: string,
    @Query('limit')     limit     = 8,
  ) {
    return this.searchService.getRelated(productId, +limit);
  }

  // ── GET /search/category/:slug ────────────────
  @Get('category/:slug')
  @ApiOperation({ summary: 'Browse all products in a category with full filtering' })
  @ApiParam({ name: 'slug', example: 'electronics' })
  browseCategory(
    @Param('slug') slug: string,
    @Query()       dto:  SearchQueryDto,
  ) {
    return this.searchService.browseCategory(slug, dto);
  }
}
