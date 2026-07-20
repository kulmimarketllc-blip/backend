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
exports.SupportTicketReply = exports.SupportTicket = exports.SupportTicketCategory = exports.SupportTicketStatus = exports.SupportTicketPriority = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const user_entity_1 = require("./user.entity");
var SupportTicketPriority;
(function (SupportTicketPriority) {
    SupportTicketPriority["LOW"] = "low";
    SupportTicketPriority["MEDIUM"] = "medium";
    SupportTicketPriority["HIGH"] = "high";
    SupportTicketPriority["URGENT"] = "urgent";
})(SupportTicketPriority || (exports.SupportTicketPriority = SupportTicketPriority = {}));
var SupportTicketStatus;
(function (SupportTicketStatus) {
    SupportTicketStatus["OPEN"] = "open";
    SupportTicketStatus["IN_PROGRESS"] = "in_progress";
    SupportTicketStatus["RESOLVED"] = "resolved";
    SupportTicketStatus["CLOSED"] = "closed";
})(SupportTicketStatus || (exports.SupportTicketStatus = SupportTicketStatus = {}));
var SupportTicketCategory;
(function (SupportTicketCategory) {
    SupportTicketCategory["ORDER"] = "order";
    SupportTicketCategory["PAYMENT"] = "payment";
    SupportTicketCategory["DELIVERY"] = "delivery";
    SupportTicketCategory["ACCOUNT"] = "account";
    SupportTicketCategory["MERCHANT"] = "merchant";
    SupportTicketCategory["OTHER"] = "other";
})(SupportTicketCategory || (exports.SupportTicketCategory = SupportTicketCategory = {}));
let SupportTicket = class SupportTicket extends base_entity_1.BaseEntity {
};
exports.SupportTicket = SupportTicket;
__decorate([
    (0, typeorm_1.Column)({ name: 'ticket_no', length: 24, unique: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "ticketNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', length: 26 }),
    __metadata("design:type", String)
], SupportTicket.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_to_id', length: 26, nullable: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "assignedToId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id', length: 20, nullable: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 180 }),
    __metadata("design:type", String)
], SupportTicket.prototype, "subject", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SupportTicket.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SupportTicketCategory,
        default: SupportTicketCategory.OTHER,
    }),
    __metadata("design:type", String)
], SupportTicket.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SupportTicketPriority,
        default: SupportTicketPriority.MEDIUM,
    }),
    __metadata("design:type", String)
], SupportTicket.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: SupportTicketStatus,
        default: SupportTicketStatus.OPEN,
    }),
    __metadata("design:type", String)
], SupportTicket.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SupportTicket.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolved_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SupportTicket.prototype, "resolvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'closed_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SupportTicket.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_reply_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], SupportTicket.prototype, "lastReplyAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_reply_by_id', length: 26, nullable: true }),
    __metadata("design:type", String)
], SupportTicket.prototype, "lastReplyById", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", user_entity_1.User)
], SupportTicket.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'assigned_to_id' }),
    __metadata("design:type", user_entity_1.User)
], SupportTicket.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => SupportTicketReply, (reply) => reply.ticket),
    __metadata("design:type", Array)
], SupportTicket.prototype, "replies", void 0);
exports.SupportTicket = SupportTicket = __decorate([
    (0, typeorm_1.Entity)('support_tickets'),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['priority']),
    (0, typeorm_1.Index)(['customerId']),
    (0, typeorm_1.Index)(['assignedToId']),
    (0, typeorm_1.Index)(['createdAt'])
], SupportTicket);
let SupportTicketReply = class SupportTicketReply extends base_entity_1.BaseEntity {
};
exports.SupportTicketReply = SupportTicketReply;
__decorate([
    (0, typeorm_1.Column)({ name: 'ticket_id', length: 26 }),
    __metadata("design:type", String)
], SupportTicketReply.prototype, "ticketId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'author_id', length: 26 }),
    __metadata("design:type", String)
], SupportTicketReply.prototype, "authorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SupportTicketReply.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_internal', default: false }),
    __metadata("design:type", Boolean)
], SupportTicketReply.prototype, "isInternal", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => SupportTicket, (ticket) => ticket.replies, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'ticket_id' }),
    __metadata("design:type", SupportTicket)
], SupportTicketReply.prototype, "ticket", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'author_id' }),
    __metadata("design:type", user_entity_1.User)
], SupportTicketReply.prototype, "author", void 0);
exports.SupportTicketReply = SupportTicketReply = __decorate([
    (0, typeorm_1.Entity)('support_ticket_replies'),
    (0, typeorm_1.Index)(['ticketId']),
    (0, typeorm_1.Index)(['authorId']),
    (0, typeorm_1.Index)(['createdAt'])
], SupportTicketReply);
//# sourceMappingURL=support-ticket.entity.js.map