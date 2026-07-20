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
exports.AppNotification = exports.NotificationType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const user_entity_1 = require("./user.entity");
var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER"] = "order";
    NotificationType["DISPUTE"] = "dispute";
    NotificationType["SYSTEM"] = "system";
    NotificationType["PROMO"] = "promo";
    NotificationType["REVIEW"] = "review";
    NotificationType["SUPPORT"] = "support";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
let AppNotification = class AppNotification extends base_entity_1.BaseEntity {
};
exports.AppNotification = AppNotification;
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 26 }),
    __metadata("design:type", String)
], AppNotification.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], AppNotification.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], AppNotification.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: NotificationType, default: NotificationType.SYSTEM }),
    __metadata("design:type", String)
], AppNotification.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'action_url' }),
    __metadata("design:type", String)
], AppNotification.prototype, "actionUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_read' }),
    __metadata("design:type", Boolean)
], AppNotification.prototype, "isRead", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], AppNotification.prototype, "user", void 0);
exports.AppNotification = AppNotification = __decorate([
    (0, typeorm_1.Entity)('app_notifications'),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['isRead']),
    (0, typeorm_1.Index)(['createdAt'])
], AppNotification);
//# sourceMappingURL=notification.entity.js.map