"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const reviews_service_1 = require("./reviews.service");
const reviews_controller_1 = require("./reviews.controller");
const review_coupon_entities_1 = require("../database/entities/review-coupon.entities");
const product_entity_1 = require("../database/entities/product.entity");
const order_entity_1 = require("../database/entities/order.entity");
const merchants_module_1 = require("../merchants/merchants.module");
const notifications_module_1 = require("../notifications/notifications.module");
let ReviewsModule = class ReviewsModule {
};
exports.ReviewsModule = ReviewsModule;
exports.ReviewsModule = ReviewsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([review_coupon_entities_1.Review, review_coupon_entities_1.ReviewHelpful, product_entity_1.Product, order_entity_1.Order, order_entity_1.OrderItem]),
            merchants_module_1.MerchantsModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [reviews_controller_1.ReviewsController],
        providers: [reviews_service_1.ReviewsService],
        exports: [reviews_service_1.ReviewsService],
    })
], ReviewsModule);
//# sourceMappingURL=reviews.module.js.map