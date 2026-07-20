"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubAdminModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const sub_admin_service_1 = require("./sub-admin.service");
const sub_admin_controller_1 = require("./sub-admin.controller");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const user_entity_1 = require("../database/entities/user.entity");
const review_coupon_entities_1 = require("../database/entities/review-coupon.entities");
const product_entity_1 = require("../database/entities/product.entity");
const sub_admin_features_entity_1 = require("../database/entities/sub-admin-features.entity");
const merchants_module_1 = require("../merchants/merchants.module");
const orders_module_1 = require("../orders/orders.module");
const notifications_module_1 = require("../notifications/notifications.module");
let SubAdminModule = class SubAdminModule {
};
exports.SubAdminModule = SubAdminModule;
exports.SubAdminModule = SubAdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                supporting_entities_1.Merchant, user_entity_1.User, review_coupon_entities_1.Review, product_entity_1.Product, sub_admin_features_entity_1.Dispute, sub_admin_features_entity_1.AdminActivityLog, sub_admin_features_entity_1.SubAdminPermission, sub_admin_features_entity_1.SubAdminReport
            ]),
            merchants_module_1.MerchantsModule,
            orders_module_1.OrdersModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [sub_admin_controller_1.SubAdminController],
        providers: [sub_admin_service_1.SubAdminService],
        exports: [sub_admin_service_1.SubAdminService],
    })
], SubAdminModule);
//# sourceMappingURL=sub-admin.module.js.map