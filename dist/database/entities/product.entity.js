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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Product = exports.ProductStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const supporting_entities_1 = require("./supporting.entities");
const order_entity_1 = require("./order.entity");
const review_coupon_entities_1 = require("./review-coupon.entities");
var ProductStatus;
(function (ProductStatus) {
    ProductStatus["ACTIVE"] = "active";
    ProductStatus["INACTIVE"] = "inactive";
    ProductStatus["OUT_OF_STOCK"] = "out_of_stock";
    ProductStatus["PENDING_REVIEW"] = "pending_review";
    ProductStatus["REJECTED"] = "rejected";
})(ProductStatus || (exports.ProductStatus = ProductStatus = {}));
let Product = class Product extends base_entity_1.BaseEntity {
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.Column)({ name: 'merchant_id', length: 26 }),
    __metadata("design:type", String)
], Product.prototype, "merchantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'category_id', length: 26 }),
    __metadata("design:type", String)
], Product.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 220 }),
    __metadata("design:type", String)
], Product.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'compare_price' }),
    __metadata("design:type", Number)
], Product.prototype, "comparePrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], Product.prototype, "stock", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, unique: true, length: 100 }),
    __metadata("design:type", String)
], Product.prototype, "sku", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 10, name: 'low_stock_at' }),
    __metadata("design:type", Number)
], Product.prototype, "lowStockAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE }),
    __metadata("design:type", String)
], Product.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Product.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [], nullable: true }),
    __metadata("design:type", Array)
], Product.prototype, "variants", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 1, default: 0, name: 'avg_rating' }),
    __metadata("design:type", Number)
], Product.prototype, "avgRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'review_count' }),
    __metadata("design:type", Number)
], Product.prototype, "reviewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'total_sold' }),
    __metadata("design:type", Number)
], Product.prototype, "totalSold", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_featured' }),
    __metadata("design:type", Boolean)
], Product.prototype, "isFeatured", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'flag_count' }),
    __metadata("design:type", Number)
], Product.prototype, "flagCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Product.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supporting_entities_1.Merchant, (m) => m.products),
    (0, typeorm_1.JoinColumn)({ name: 'merchant_id' }),
    __metadata("design:type", supporting_entities_1.Merchant)
], Product.prototype, "merchant", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supporting_entities_1.Category, (c) => c.products),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", supporting_entities_1.Category)
], Product.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_entity_1.OrderItem, (item) => item.product),
    __metadata("design:type", Array)
], Product.prototype, "orderItems", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => review_coupon_entities_1.Review, (review) => review.product),
    __metadata("design:type", Array)
], Product.prototype, "reviews", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => supporting_entities_1.Wishlist, (wish) => wish.product),
    __metadata("design:type", Array)
], Product.prototype, "wishlistEntries", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)('products'),
    (0, typeorm_1.Index)(['slug'], { unique: true }),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['merchantId'])
], Product);
//# sourceMappingURL=product.entity.js.map