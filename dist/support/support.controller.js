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
exports.SupportController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const support_service_1 = require("./support.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const user_entity_1 = require("../database/entities/user.entity");
const list_support_tickets_dto_1 = require("./dto/list-support-tickets.dto");
const update_ticket_status_dto_1 = require("./dto/update-ticket-status.dto");
const create_ticket_reply_dto_1 = require("./dto/create-ticket-reply.dto");
const create_ticket_dto_1 = require("./dto/create-ticket.dto");
const assign_ticket_dto_1 = require("./dto/assign-ticket.dto");
let SupportController = class SupportController {
    constructor(supportService) {
        this.supportService = supportService;
    }
    create(dto, user) {
        return this.supportService.createTicket(dto, user);
    }
    list(query, user) {
        return this.supportService.listTickets(query, user);
    }
    getCounts(user) {
        return this.supportService.getTicketCounts(user);
    }
    getById(id, user) {
        return this.supportService.getTicketById(id, user);
    }
    updateStatus(id, dto, user) {
        return this.supportService.updateTicketStatus(id, dto, user);
    }
    addReply(id, dto, user) {
        return this.supportService.addTicketReply(id, dto, user);
    }
    assign(id, dto, user) {
        return this.supportService.assignTicket(id, dto.assignedToId, user);
    }
};
exports.SupportController = SupportController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new support ticket' }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_ticket_dto_1.CreateSupportTicketDto,
        user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List support tickets' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [list_support_tickets_dto_1.ListSupportTicketsDto,
        user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('counts'),
    (0, swagger_1.ApiOperation)({ summary: 'Get support ticket counts by status' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "getCounts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get support ticket details with replies' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "getById", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Update support ticket status' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_ticket_status_dto_1.UpdateTicketStatusDto,
        user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Post)(':id/replies'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Add reply to support ticket' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_ticket_reply_dto_1.CreateTicketReplyDto,
        user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "addReply", null);
__decorate([
    (0, common_1.Patch)(':id/assign'),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Assign support ticket to a sub-admin/admin user' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, assign_ticket_dto_1.AssignTicketDto,
        user_entity_1.User]),
    __metadata("design:returntype", void 0)
], SupportController.prototype, "assign", null);
exports.SupportController = SupportController = __decorate([
    (0, swagger_1.ApiTags)('support-tickets'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('support/tickets'),
    __metadata("design:paramtypes", [support_service_1.SupportService])
], SupportController);
//# sourceMappingURL=support.controller.js.map