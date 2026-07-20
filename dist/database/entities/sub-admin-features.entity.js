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
exports.SubAdminReport = exports.ReportStatus = exports.SubAdminPermission = exports.AdminActivityLog = exports.Dispute = exports.DisputeStatus = exports.DisputeReason = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const user_entity_1 = require("./user.entity");
const order_entity_1 = require("./order.entity");
const supporting_entities_1 = require("./supporting.entities");
var DisputeReason;
(function (DisputeReason) {
    DisputeReason["ITEM_NOT_RECEIVED"] = "item_not_received";
    DisputeReason["ITEM_NOT_AS_DESCRIBED"] = "item_not_as_described";
    DisputeReason["DEFECTIVE"] = "defective";
    DisputeReason["FRAUDULENT_ACTIVITY"] = "fraudulent_activity";
    DisputeReason["MERCHANT_CANCELLATION"] = "merchant_cancellation";
    DisputeReason["OTHER"] = "other";
})(DisputeReason || (exports.DisputeReason = DisputeReason = {}));
var DisputeStatus;
(function (DisputeStatus) {
    DisputeStatus["PENDING"] = "pending";
    DisputeStatus["UNDER_REVIEW"] = "under_review";
    DisputeStatus["MERCHANT_RESPONSE_REQUIRED"] = "merchant_response_required";
    DisputeStatus["RESOLVED"] = "resolved";
    DisputeStatus["CLOSED"] = "closed";
})(DisputeStatus || (exports.DisputeStatus = DisputeStatus = {}));
let Dispute = class Dispute extends base_entity_1.BaseEntity {
};
exports.Dispute = Dispute;
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id', length: 20 }),
    __metadata("design:type", String)
], Dispute.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', length: 26 }),
    __metadata("design:type", String)
], Dispute.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'merchant_id', length: 26 }),
    __metadata("design:type", String)
], Dispute.prototype, "merchantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DisputeReason, default: DisputeReason.OTHER }),
    __metadata("design:type", String)
], Dispute.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Dispute.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Array)
], Dispute.prototype, "evidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.PENDING }),
    __metadata("design:type", String)
], Dispute.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Dispute.prototype, "resolution", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [] }),
    __metadata("design:type", Array)
], Dispute.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order),
    (0, typeorm_1.JoinColumn)({ name: 'order_id' }),
    __metadata("design:type", order_entity_1.Order)
], Dispute.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", user_entity_1.User)
], Dispute.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supporting_entities_1.Merchant),
    (0, typeorm_1.JoinColumn)({ name: 'merchant_id' }),
    __metadata("design:type", supporting_entities_1.Merchant)
], Dispute.prototype, "merchant", void 0);
exports.Dispute = Dispute = __decorate([
    (0, typeorm_1.Entity)('disputes'),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['orderId']),
    (0, typeorm_1.Index)(['customerId']),
    (0, typeorm_1.Index)(['merchantId'])
], Dispute);
let AdminActivityLog = class AdminActivityLog extends base_entity_1.BaseEntity {
};
exports.AdminActivityLog = AdminActivityLog;
__decorate([
    (0, typeorm_1.Column)({ name: 'admin_id', length: 26 }),
    __metadata("design:type", String)
], AdminActivityLog.prototype, "adminId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AdminActivityLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_type' }),
    __metadata("design:type", String)
], AdminActivityLog.prototype, "targetType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'target_id' }),
    __metadata("design:type", String)
], AdminActivityLog.prototype, "targetId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], AdminActivityLog.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', nullable: true }),
    __metadata("design:type", String)
], AdminActivityLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'admin_id' }),
    __metadata("design:type", user_entity_1.User)
], AdminActivityLog.prototype, "admin", void 0);
exports.AdminActivityLog = AdminActivityLog = __decorate([
    (0, typeorm_1.Entity)('admin_activity_logs'),
    (0, typeorm_1.Index)(['adminId']),
    (0, typeorm_1.Index)(['targetType', 'targetId']),
    (0, typeorm_1.Index)(['createdAt'])
], AdminActivityLog);
let SubAdminPermission = class SubAdminPermission extends base_entity_1.BaseEntity {
};
exports.SubAdminPermission = SubAdminPermission;
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 26, unique: true }),
    __metadata("design:type", String)
], SubAdminPermission.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'can_manage_users' }),
    __metadata("design:type", Boolean)
], SubAdminPermission.prototype, "canManageUsers", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'can_manage_disputes' }),
    __metadata("design:type", Boolean)
], SubAdminPermission.prototype, "canManageDisputes", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'can_approve_merchants' }),
    __metadata("design:type", Boolean)
], SubAdminPermission.prototype, "canApproveMerchants", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'can_moderate_reviews' }),
    __metadata("design:type", Boolean)
], SubAdminPermission.prototype, "canModerateReviews", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'can_view_dashboard' }),
    __metadata("design:type", Boolean)
], SubAdminPermission.prototype, "canViewDashboard", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'can_edit_permissions' }),
    __metadata("design:type", Boolean)
], SubAdminPermission.prototype, "canEditPermissions", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], SubAdminPermission.prototype, "user", void 0);
exports.SubAdminPermission = SubAdminPermission = __decorate([
    (0, typeorm_1.Entity)('sub_admin_permissions')
], SubAdminPermission);
var ReportStatus;
(function (ReportStatus) {
    ReportStatus["DRAFT"] = "draft";
    ReportStatus["SUBMITTED"] = "submitted";
    ReportStatus["ARCHIVED"] = "archived";
})(ReportStatus || (exports.ReportStatus = ReportStatus = {}));
let SubAdminReport = class SubAdminReport extends base_entity_1.BaseEntity {
};
exports.SubAdminReport = SubAdminReport;
__decorate([
    (0, typeorm_1.Column)({ name: 'admin_id', length: 26 }),
    __metadata("design:type", String)
], SubAdminReport.prototype, "adminId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200 }),
    __metadata("design:type", String)
], SubAdminReport.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SubAdminReport.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ReportStatus, default: ReportStatus.DRAFT }),
    __metadata("design:type", String)
], SubAdminReport.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], SubAdminReport.prototype, "data", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'file_url' }),
    __metadata("design:type", String)
], SubAdminReport.prototype, "fileUrl", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'admin_id' }),
    __metadata("design:type", user_entity_1.User)
], SubAdminReport.prototype, "admin", void 0);
exports.SubAdminReport = SubAdminReport = __decorate([
    (0, typeorm_1.Entity)('sub_admin_reports'),
    (0, typeorm_1.Index)(['adminId'])
], SubAdminReport);
//# sourceMappingURL=sub-admin-features.entity.js.map