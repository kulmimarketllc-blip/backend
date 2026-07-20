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
exports.Wishlist = exports.Review = exports.Category = exports.Address = exports.AddressType = exports.Merchant = exports.MerchantStatus = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const user_entity_1 = require("./user.entity");
const product_entity_1 = require("./product.entity");
var MerchantStatus;
(function (MerchantStatus) {
    MerchantStatus["PENDING"] = "pending";
    MerchantStatus["APPROVED"] = "approved";
    MerchantStatus["SUSPENDED"] = "suspended";
    MerchantStatus["REJECTED"] = "rejected";
})(MerchantStatus || (exports.MerchantStatus = MerchantStatus = {}));
let Merchant = class Merchant extends base_entity_1.BaseEntity {
};
exports.Merchant = Merchant;
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 26, unique: true }),
    __metadata("design:type", String)
], Merchant.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 120, name: 'store_name' }),
    __metadata("design:type", String)
], Merchant.prototype, "storeName", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 130, name: 'store_slug' }),
    __metadata("design:type", String)
], Merchant.prototype, "storeSlug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Merchant.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'logo_url', length: 500 }),
    __metadata("design:type", String)
], Merchant.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'banner_url', length: 500 }),
    __metadata("design:type", String)
], Merchant.prototype, "bannerUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: MerchantStatus, default: MerchantStatus.PENDING }),
    __metadata("design:type", String)
], Merchant.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_verified' }),
    __metadata("design:type", Boolean)
], Merchant.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_online' }),
    __metadata("design:type", Boolean)
], Merchant.prototype, "isOnline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 8.0, name: 'commission_rate' }),
    __metadata("design:type", Number)
], Merchant.prototype, "commissionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_revenue' }),
    __metadata("design:type", Number)
], Merchant.prototype, "totalRevenue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'available_balance' }),
    __metadata("design:type", Number)
], Merchant.prototype, "availableBalance", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'stripe_account_id' }),
    __metadata("design:type", String)
], Merchant.prototype, "stripeAccountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 1, default: 0, name: 'avg_rating' }),
    __metadata("design:type", Number)
], Merchant.prototype, "avgRating", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'return_policy_days' }),
    __metadata("design:type", Number)
], Merchant.prototype, "returnPolicyDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'business_info' }),
    __metadata("design:type", Object)
], Merchant.prototype, "businessInfo", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Merchant.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_entity_1.Product, (p) => p.merchant),
    __metadata("design:type", Array)
], Merchant.prototype, "products", void 0);
exports.Merchant = Merchant = __decorate([
    (0, typeorm_1.Entity)('merchants')
], Merchant);
var AddressType;
(function (AddressType) {
    AddressType["HOME"] = "home";
    AddressType["WORK"] = "work";
    AddressType["OTHER"] = "other";
})(AddressType || (exports.AddressType = AddressType = {}));
let Address = class Address extends base_entity_1.BaseEntity {
};
exports.Address = Address;
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 26 }),
    __metadata("design:type", String)
], Address.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AddressType, default: AddressType.HOME }),
    __metadata("design:type", String)
], Address.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'full_name', length: 160 }),
    __metadata("design:type", String)
], Address.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 160 }),
    __metadata("design:type", String)
], Address.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20 }),
    __metadata("design:type", String)
], Address.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 300, name: 'address_line1' }),
    __metadata("design:type", String)
], Address.prototype, "addressLine1", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 200, name: 'address_line2' }),
    __metadata("design:type", String)
], Address.prototype, "addressLine2", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Address.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], Address.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, name: 'zip_code' }),
    __metadata("design:type", String)
], Address.prototype, "zipCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80, default: 'United States' }),
    __metadata("design:type", String)
], Address.prototype, "country", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_default' }),
    __metadata("design:type", Boolean)
], Address.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 9, scale: 6, nullable: true }),
    __metadata("design:type", Number)
], Address.prototype, "lat", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 9, scale: 6, nullable: true }),
    __metadata("design:type", Number)
], Address.prototype, "lng", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (u) => u.addresses),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Address.prototype, "user", void 0);
exports.Address = Address = __decorate([
    (0, typeorm_1.Entity)('addresses')
], Address);
let Category = class Category extends base_entity_1.BaseEntity {
};
exports.Category = Category;
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 80 }),
    __metadata("design:type", String)
], Category.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 90 }),
    __metadata("design:type", String)
], Category.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'icon_url', length: 500 }),
    __metadata("design:type", String)
], Category.prototype, "iconUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'parent_id', length: 26 }),
    __metadata("design:type", String)
], Category.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'is_active' }),
    __metadata("design:type", Boolean)
], Category.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'sort_order' }),
    __metadata("design:type", Number)
], Category.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_entity_1.Product, (p) => p.category),
    __metadata("design:type", Array)
], Category.prototype, "products", void 0);
exports.Category = Category = __decorate([
    (0, typeorm_1.Entity)('categories')
], Category);
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
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Review.prototype, "comment", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [], nullable: true }),
    __metadata("design:type", Array)
], Review.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_verified_purchase' }),
    __metadata("design:type", Boolean)
], Review.prototype, "isVerifiedPurchase", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'merchant_reply', type: 'text' }),
    __metadata("design:type", String)
], Review.prototype, "merchantReply", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'merchant_replied_at' }),
    __metadata("design:type", Date)
], Review.prototype, "merchantRepliedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, (p) => p.reviews),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], Review.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (u) => u.reviews),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Review.prototype, "user", void 0);
exports.Review = Review = __decorate([
    (0, typeorm_1.Entity)('reviews'),
    (0, typeorm_1.Index)(['productId']),
    (0, typeorm_1.Index)(['userId'])
], Review);
let Wishlist = class Wishlist extends base_entity_1.BaseEntity {
};
exports.Wishlist = Wishlist;
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 26 }),
    __metadata("design:type", String)
], Wishlist.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id', length: 26 }),
    __metadata("design:type", String)
], Wishlist.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (u) => u.wishlist),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Wishlist.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product, (p) => p.wishlistEntries),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], Wishlist.prototype, "product", void 0);
exports.Wishlist = Wishlist = __decorate([
    (0, typeorm_1.Entity)('wishlist'),
    (0, typeorm_1.Index)(['userId', 'productId'], { unique: true })
], Wishlist);
//# sourceMappingURL=supporting.entities.js.map