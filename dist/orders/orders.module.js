"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const bull_1 = require("@nestjs/bull");
const order_entity_1 = require("../database/entities/order.entity");
const product_entity_1 = require("../database/entities/product.entity");
const user_entity_1 = require("../database/entities/user.entity");
const sub_admin_features_entity_1 = require("../database/entities/sub-admin-features.entity");
const orders_service_1 = require("./orders.service");
const orders_controller_1 = require("./orders.controller");
const orders_processor_1 = require("./orders.processor");
const notifications_module_1 = require("../notifications/notifications.module");
const merchants_module_1 = require("../merchants/merchants.module");
const payments_module_1 = require("../payments/payments.module");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([order_entity_1.Order, order_entity_1.OrderItem, product_entity_1.Product, user_entity_1.User, sub_admin_features_entity_1.Dispute]),
            bull_1.BullModule.registerQueue({ name: 'orders' }),
            notifications_module_1.NotificationsModule,
            merchants_module_1.MerchantsModule,
            payments_module_1.PaymentsModule,
        ],
        providers: [orders_service_1.OrdersService, orders_processor_1.OrdersProcessor],
        controllers: [orders_controller_1.OrdersController],
        exports: [orders_service_1.OrdersService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map