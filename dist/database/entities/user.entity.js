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
exports.User = exports.AuthProvider = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const class_transformer_1 = require("class-transformer");
const base_entity_1 = require("./base.entity");
const order_entity_1 = require("./order.entity");
const supporting_entities_1 = require("./supporting.entities");
const review_coupon_entities_1 = require("./review-coupon.entities");
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "customer";
    UserRole["MERCHANT"] = "merchant";
    UserRole["DELIVERY_PARTNER"] = "delivery_partner";
    UserRole["SUB_ADMIN"] = "sub_admin";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var AuthProvider;
(function (AuthProvider) {
    AuthProvider["LOCAL"] = "local";
    AuthProvider["GOOGLE"] = "google";
    AuthProvider["FACEBOOK"] = "facebook";
})(AuthProvider || (exports.AuthProvider = AuthProvider = {}));
let User = class User extends base_entity_1.BaseEntity {
    get fullName() {
        return `${this.firstName} ${this.lastName}`;
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], User.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 80 }),
    __metadata("design:type", String)
], User.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true, length: 255 }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 20 }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL }),
    __metadata("design:type", String)
], User.prototype, "provider", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "providerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, length: 500 }),
    __metadata("design:type", String)
], User.prototype, "avatarUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "customerSettings", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    (0, class_transformer_1.Exclude)(),
    __metadata("design:type", String)
], User.prototype, "refreshTokenHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "fcmToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_suspended' }),
    __metadata("design:type", Boolean)
], User.prototype, "isSuspended", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'suspension_reason' }),
    __metadata("design:type", String)
], User.prototype, "suspensionReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0, name: 'warning_count' }),
    __metadata("design:type", Number)
], User.prototype, "warningCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'moderation_notes' }),
    __metadata("design:type", String)
], User.prototype, "moderationNotes", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => order_entity_1.Order, (order) => order.customer),
    __metadata("design:type", Array)
], User.prototype, "orders", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => supporting_entities_1.Address, (address) => address.user),
    __metadata("design:type", Array)
], User.prototype, "addresses", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => review_coupon_entities_1.Review, (review) => review.user),
    __metadata("design:type", Array)
], User.prototype, "reviews", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => supporting_entities_1.Wishlist, (wish) => wish.user),
    __metadata("design:type", Array)
], User.prototype, "wishlist", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Index)(['email'], { unique: true }),
    (0, typeorm_1.Index)(['phone'], { unique: true, where: '"phone" IS NOT NULL' }),
    (0, typeorm_1.Index)(['firstName']),
    (0, typeorm_1.Index)(['lastName'])
], User);
//# sourceMappingURL=user.entity.js.map