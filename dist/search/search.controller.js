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
exports.SearchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const search_service_1 = require("./search.service");
const search_query_dto_1 = require("./dto/search-query.dto");
const public_decorator_1 = require("../common/decorators/public.decorator");
let SearchController = class SearchController {
    constructor(searchService) {
        this.searchService = searchService;
    }
    search(dto) {
        return this.searchService.search(dto);
    }
    autocomplete(q = '', limit = 8, category = '') {
        return this.searchService.autocomplete(q, +limit, category);
    }
    getTrending(limit = 10) {
        return this.searchService.getTrending(+limit);
    }
    getRelated(productId, limit = 8) {
        return this.searchService.getRelated(productId, +limit);
    }
    browseCategory(slug, dto) {
        return this.searchService.browseCategory(slug, dto);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Full-text product search with filters, facets, and suggestions',
        description: `
      Searches products using PostgreSQL full-text search (ts_rank).
      Returns matching products, category suggestions, query suggestions,
      and facets for filters (category, price range, rating).
    `,
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_query_dto_1.SearchQueryDto]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('autocomplete'),
    (0, swagger_1.ApiOperation)({ summary: 'Get autocomplete suggestions for a search query' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, description: 'Partial search term (min 2 chars)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number, description: 'Max results (default 8)' }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false, description: 'Filter by category name (optional)' }),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "autocomplete", null);
__decorate([
    (0, common_1.Get)('trending'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trending search queries from the last 24 hours' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "getTrending", null);
__decorate([
    (0, common_1.Get)('related/:productId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get related products for a given product' }),
    (0, swagger_1.ApiParam)({ name: 'productId', description: 'Product ID to find related items for' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Param)('productId')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "getRelated", null);
__decorate([
    (0, common_1.Get)('category/:slug'),
    (0, swagger_1.ApiOperation)({ summary: 'Browse all products in a category with full filtering' }),
    (0, swagger_1.ApiParam)({ name: 'slug', example: 'electronics' }),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, search_query_dto_1.SearchQueryDto]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "browseCategory", null);
exports.SearchController = SearchController = __decorate([
    (0, swagger_1.ApiTags)('search'),
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
//# sourceMappingURL=search.controller.js.map