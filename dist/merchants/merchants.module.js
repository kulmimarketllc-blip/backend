"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const order_entity_1 = require("../database/entities/order.entity");
const merchants_service_1 = require("./merchants.service");
const merchants_controller_1 = require("./merchants.controller");
const payments_module_1 = require("../payments/payments.module");
const notifications_module_1 = require("../notifications/notifications.module");
let MerchantsModule = class MerchantsModule {
};
exports.MerchantsModule = MerchantsModule;
exports.MerchantsModule = MerchantsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([supporting_entities_1.Merchant, order_entity_1.OrderItem]), payments_module_1.PaymentsModule, notifications_module_1.NotificationsModule],
        providers: [merchants_service_1.MerchantsService],
        controllers: [merchants_controller_1.MerchantsController],
        exports: [merchants_service_1.MerchantsService],
    })
], MerchantsModule);
//# sourceMappingURL=merchants.module.js.map