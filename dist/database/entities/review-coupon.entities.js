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
exports.CouponUsage = exports.Coupon = exports.CouponScope = exports.CouponType = exports.ReviewHelpful = exports.Review = exports.ReviewStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const user_entity_1 = require("./user.entity");
const product_entity_1 = require("./product.entity");
var ReviewStatus;
(function (ReviewStatus) {
    ReviewStatus["PENDING"] = "pending";
    ReviewStatus["APPROVED"] = "approved";
    ReviewStatus["REJECTED"] = "rejected";
    ReviewStatus["FLAGGED"] = "flagged";
})(ReviewStatus || (exports.ReviewStatus = ReviewStatus = {}));
let Review = class Review extends base_entity_1.BaseEntity {
};
exports.Review = Review;
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id', length: 26 }),
    __metadata("design:type", String)
], Review.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 26 }),
    __metadata("design:type", String)
], Review.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id', length: 20 }),
    __metadata("design:type", String)
], Review.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'smallint' }),
    __metadata("design:type", Number)
], Review.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", String)
], Review.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Review.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [], nullable: true }),
    __metadata("design:type", Array)
], Review.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_verified_purchase' }),
    __metadata("design:type", Boolean)
], Review.prototype, "isVerifiedPurchase", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'helpful_count' }),
    __metadata("design:type", Number)
], Review.prototype, "helpfulCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'flag_count' }),
    __metadata("design:type", Number)
], Review.prototype, "flagCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.APPROVED }),
    __metadata("design:type", String)
], Review.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'merchant_reply', type: 'text' }),
    __metadata("design:type", String)
], Review.prototype, "merchantReply", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'merchant_replied_at' }),
    __metadata("design:type", Date)
], Review.prototype, "merchantRepliedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'merchant_id', length: 26 }),
    __metadata("design:type", String)
], Review.prototype, "merchantId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], Review.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Review.prototype, "user", void 0);
exports.Review = Review = __decorate([
    (0, typeorm_1.Entity)('reviews'),
    (0, typeorm_1.Index)(['productId']),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['orderId']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Check)('"rating" BETWEEN 1 AND 5')
], Review);
let ReviewHelpful = class ReviewHelpful {
};
exports.ReviewHelpful = ReviewHelpful;
__decorate([
    (0, typeorm_1.Column)({ primary: true, length: 26 }),
    __metadata("design:type", String)
], ReviewHelpful.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'review_id', length: 26 }),
    __metadata("design:type", String)
], ReviewHelpful.prototype, "reviewId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 26 }),
    __metadata("design:type", String)
], ReviewHelpful.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'created_at', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], ReviewHelpful.prototype, "createdAt", void 0);
exports.ReviewHelpful = ReviewHelpful = __decorate([
    (0, typeorm_1.Entity)('review_helpful'),
    (0, typeorm_1.Index)(['reviewId', 'userId'], { unique: true })
], ReviewHelpful);
var CouponType;
(function (CouponType) {
    CouponType["PERCENTAGE"] = "percentage";
    CouponType["FLAT"] = "flat";
    CouponType["FREE_SHIP"] = "free_shipping";
})(CouponType || (exports.CouponType = CouponType = {}));
var CouponScope;
(function (CouponScope) {
    CouponScope["ALL"] = "all";
    CouponScope["CATEGORY"] = "category";
    CouponScope["MERCHANT"] = "merchant";
    CouponScope["PRODUCT"] = "product";
    CouponScope["FIRST_ORDER"] = "first_order";
})(CouponScope || (exports.CouponScope = CouponScope = {}));
let Coupon = class Coupon extends base_entity_1.BaseEntity {
};
exports.Coupon = Coupon;
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 30 }),
    __metadata("design:type", String)
], Coupon.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Coupon.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: CouponType }),
    __metadata("design:type", String)
], Coupon.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Coupon.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'max_discount' }),
    __metadata("design:type", Number)
], Coupon.prototype, "maxDiscount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'min_order_value' }),
    __metadata("design:type", Number)
], Coupon.prototype, "minOrderValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: CouponScope, default: CouponScope.ALL }),
    __metadata("design:type", String)
], Coupon.prototype, "scope", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'scope_id', length: 26 }),
    __metadata("design:type", String)
], Coupon.prototype, "scopeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'max_uses' }),
    __metadata("design:type", Number)
], Coupon.prototype, "maxUses", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'used_count' }),
    __metadata("design:type", Number)
], Coupon.prototype, "usedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'max_uses_per_user' }),
    __metadata("design:type", Number)
], Coupon.prototype, "maxUsesPerUser", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], Coupon.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'starts_at' }),
    __metadata("design:type", Date)
], Coupon.prototype, "startsAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'expires_at' }),
    __metadata("design:type", Date)
], Coupon.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'created_by', length: 26 }),
    __metadata("design:type", String)
], Coupon.prototype, "createdBy", void 0);
exports.Coupon = Coupon = __decorate([
    (0, typeorm_1.Entity)('coupons'),
    (0, typeorm_1.Index)(['code'], { unique: true }),
    (0, typeorm_1.Index)(['isActive']),
    (0, typeorm_1.Index)(['expiresAt'])
], Coupon);
let CouponUsage = class CouponUsage {
};
exports.CouponUsage = CouponUsage;
__decorate([
    (0, typeorm_1.Column)({ primary: true, length: 26 }),
    __metadata("design:type", String)
], CouponUsage.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'coupon_id', length: 26 }),
    __metadata("design:type", String)
], CouponUsage.prototype, "couponId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 26 }),
    __metadata("design:type", String)
], CouponUsage.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id', length: 20 }),
    __metadata("design:type", String)
], CouponUsage.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'discount_applied' }),
    __metadata("design:type", Number)
], CouponUsage.prototype, "discountApplied", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'used_at', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], CouponUsage.prototype, "usedAt", void 0);
exports.CouponUsage = CouponUsage = __decorate([
    (0, typeorm_1.Entity)('coupon_usages'),
    (0, typeorm_1.Index)(['couponId', 'userId']),
    (0, typeorm_1.Index)(['orderId'], { unique: true })
], CouponUsage);
//# sourceMappingURL=review-coupon.entities.js.map