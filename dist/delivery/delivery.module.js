"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const jwt_1 = require("@nestjs/jwt");
const delivery_gateway_1 = require("./delivery.gateway");
const delivery_service_1 = require("./delivery.service");
const delivery_controller_1 = require("./delivery.controller");
const order_entity_1 = require("../database/entities/order.entity");
let DeliveryModule = class DeliveryModule {
};
exports.DeliveryModule = DeliveryModule;
exports.DeliveryModule = DeliveryModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([order_entity_1.Order]), jwt_1.JwtModule],
        providers: [delivery_gateway_1.DeliveryGateway, delivery_service_1.DeliveryService],
        controllers: [delivery_controller_1.DeliveryController],
        exports: [delivery_gateway_1.DeliveryGateway, delivery_service_1.DeliveryService],
    })
], DeliveryModule);
//# sourceMappingURL=delivery.module.js.map