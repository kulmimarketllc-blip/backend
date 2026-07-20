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
exports.CreateSupportTicketDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const support_ticket_entity_1 = require("../../database/entities/support-ticket.entity");
class CreateSupportTicketDto {
}
exports.CreateSupportTicketDto = CreateSupportTicketDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'My order hasn\'t arrived yet' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(5, 180),
    __metadata("design:type", String)
], CreateSupportTicketDto.prototype, "subject", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'I ordered a pair of headphones 5 days ago and the tracking hasn\'t updated.' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(10, 2000),
    __metadata("design:type", String)
], CreateSupportTicketDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: support_ticket_entity_1.SupportTicketCategory, example: support_ticket_entity_1.SupportTicketCategory.ORDER }),
    (0, class_validator_1.IsEnum)(support_ticket_entity_1.SupportTicketCategory),
    __metadata("design:type", String)
], CreateSupportTicketDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: support_ticket_entity_1.SupportTicketPriority, example: support_ticket_entity_1.SupportTicketPriority.MEDIUM }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(support_ticket_entity_1.SupportTicketPriority),
    __metadata("design:type", String)
], CreateSupportTicketDto.prototype, "priority", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ORD-123456' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSupportTicketDto.prototype, "orderId", void 0);
//# sourceMappingURL=create-ticket.dto.js.map