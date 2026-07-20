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
exports.ValidateCouponDto = exports.UpdateCouponDto = exports.CreateCouponDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const review_coupon_entities_1 = require("../../database/entities/review-coupon.entities");
class CreateCouponDto {
}
exports.CreateCouponDto = CreateCouponDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SUMMER25', description: 'Uppercase alphanumeric code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^[A-Z0-9_-]{3,30}$/i, { message: 'Code must be 3–30 alphanumeric characters' }),
    __metadata("design:type", String)
], CreateCouponDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '25% off all orders this summer' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateCouponDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: review_coupon_entities_1.CouponType, example: review_coupon_entities_1.CouponType.PERCENTAGE }),
    (0, class_validator_1.IsEnum)(review_coupon_entities_1.CouponType),
    __metadata("design:type", String)
], CreateCouponDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 25, description: 'Percentage (0–100) or flat dollar amount' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCouponDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 50, description: 'Max discount cap for percentage coupons' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCouponDto.prototype, "maxDiscount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 30, description: 'Minimum cart total required' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], CreateCouponDto.prototype, "minOrderValue", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: review_coupon_entities_1.CouponScope, default: review_coupon_entities_1.CouponScope.ALL }),
    (0, class_validator_1.IsEnum)(review_coupon_entities_1.CouponScope),
    __metadata("design:type", String)
], CreateCouponDto.prototype, "scope", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category / Merchant / Product ID for scoped coupons' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateCouponDto.prototype, "scopeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCouponDto.prototype, "maxUses", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Max times one user can use this coupon' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCouponDto.prototype, "maxUsesPerUser", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'When the coupon becomes active' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateCouponDto.prototype, "startsAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'When the coupon expires' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], CreateCouponDto.prototype, "expiresAt", void 0);
class UpdateCouponDto {
}
exports.UpdateCouponDto = UpdateCouponDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCouponDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCouponDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: review_coupon_entities_1.CouponType }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(review_coupon_entities_1.CouponType),
    __metadata("design:type", String)
], UpdateCouponDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateCouponDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateCouponDto.prototype, "maxDiscount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], UpdateCouponDto.prototype, "minOrderValue", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: review_coupon_entities_1.CouponScope }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(review_coupon_entities_1.CouponScope),
    __metadata("design:type", String)
], UpdateCouponDto.prototype, "scope", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateCouponDto.prototype, "scopeId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateCouponDto.prototype, "maxUses", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], UpdateCouponDto.prototype, "maxUsesPerUser", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateCouponDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], UpdateCouponDto.prototype, "startsAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Date),
    (0, class_validator_1.IsDate)(),
    __metadata("design:type", Date)
], UpdateCouponDto.prototype, "expiresAt", void 0);
class ValidateCouponDto {
}
exports.ValidateCouponDto = ValidateCouponDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'SUMMER25' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ValidateCouponDto.prototype, "code", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 129.99, description: 'Current cart total before discount' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], ValidateCouponDto.prototype, "cartTotal", void 0);
//# sourceMappingURL=index.js.map