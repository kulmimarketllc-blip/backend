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
exports.ContentModerationDto = exports.ContentModerationAction = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
var ContentModerationAction;
(function (ContentModerationAction) {
    ContentModerationAction["APPROVE"] = "approve";
    ContentModerationAction["REJECT"] = "reject";
    ContentModerationAction["REMOVE"] = "remove";
    ContentModerationAction["SUSPEND_MERCHANT"] = "suspend_merchant";
    ContentModerationAction["CLEAR_FLAGS"] = "clear_flags";
})(ContentModerationAction || (exports.ContentModerationAction = ContentModerationAction = {}));
class ContentModerationDto {
}
exports.ContentModerationDto = ContentModerationDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        enum: ContentModerationAction,
        example: ContentModerationAction.APPROVE,
        description: 'Action to take on the flagged content',
    }),
    (0, class_validator_1.IsEnum)(ContentModerationAction),
    __metadata("design:type", String)
], ContentModerationDto.prototype, "action", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Reason for the moderation action',
        example: 'Content is legitimate business information',
        minLength: 5,
        maxLength: 500,
    }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(5, 500),
    __metadata("design:type", String)
], ContentModerationDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({
        description: 'Internal note about this moderation decision',
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(0, 1000),
    __metadata("design:type", String)
], ContentModerationDto.prototype, "internalNote", void 0);
//# sourceMappingURL=content-moderation.dto.js.map