"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var DeliveryGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliveryGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../database/entities/order.entity");
const user_entity_1 = require("../database/entities/user.entity");
const bcrypt = __importStar(require("bcrypt"));
let DeliveryGateway = DeliveryGateway_1 = class DeliveryGateway {
    constructor(jwtService, config, ordersRepo) {
        this.jwtService = jwtService;
        this.config = config;
        this.ordersRepo = ordersRepo;
        this.logger = new common_1.Logger(DeliveryGateway_1.name);
        this.driverSockets = new Map();
        this.customerSockets = new Map();
    }
    async handleConnection(socket) {
        try {
            const token = socket.handshake.auth?.token
                ?? socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                socket.disconnect();
                return;
            }
            const payload = this.jwtService.verify(token, {
                secret: this.config.get('JWT_SECRET'),
            });
            socket.data.userId = payload.sub;
            socket.data.role = payload.role;
            if (payload.role === user_entity_1.UserRole.DELIVERY_PARTNER) {
                this.driverSockets.set(payload.sub, socket.id);
                socket.join(`driver:${payload.sub}`);
                this.logger.log(`Driver connected: ${payload.sub}`);
            }
            else if (payload.role === user_entity_1.UserRole.CUSTOMER) {
                this.customerSockets.set(payload.sub, socket.id);
                socket.join(`customer:${payload.sub}`);
                this.logger.log(`Customer connected: ${payload.sub}`);
            }
        }
        catch {
            socket.disconnect();
        }
    }
    handleDisconnect(socket) {
        const { userId, role } = socket.data;
        if (role === user_entity_1.UserRole.DELIVERY_PARTNER)
            this.driverSockets.delete(userId);
        if (role === user_entity_1.UserRole.CUSTOMER)
            this.customerSockets.delete(userId);
        this.logger.log(`Disconnected: ${userId}`);
    }
    async handleDriverLocation(socket, data) {
        if (socket.data.role !== user_entity_1.UserRole.DELIVERY_PARTNER) {
            throw new websockets_1.WsException('Forbidden');
        }
        const { orderId, ...location } = data;
        const order = await this.ordersRepo.findOne({ where: { id: orderId } });
        if (order?.customerId) {
            this.server.to(`customer:${order.customerId}`).emit('driver:location', {
                orderId, ...location, updatedAt: new Date().toISOString(),
            });
        }
        this.server.to('admin').emit('driver:location', {
            driverId: socket.data.userId, orderId, ...location,
        });
    }
    async handleConfirmOtp(socket, data) {
        const order = await this.ordersRepo.findOne({ where: { id: data.orderId } });
        if (!order)
            throw new websockets_1.WsException('Order not found');
        if (order.driverId !== socket.data.userId)
            throw new websockets_1.WsException('Forbidden');
        if (!order.deliveryOtp)
            throw new websockets_1.WsException('Delivery OTP not set for this order');
        const valid = await bcrypt.compare(data.otp, order.deliveryOtp);
        if (!valid) {
            socket.emit('delivery:otp-invalid', { message: 'Incorrect OTP' });
            return;
        }
        await this.ordersRepo.update(data.orderId, {
            status: order_entity_1.OrderStatus.DELIVERED,
            deliveredAt: new Date(),
        });
        this.server.to(`customer:${order.customerId}`).emit('order:delivered', {
            orderId: data.orderId, deliveredAt: new Date().toISOString(),
        });
        socket.emit('delivery:confirmed', { orderId: data.orderId });
        this.logger.log(`Order ${data.orderId} confirmed delivered by driver ${socket.data.userId}`);
    }
    notifyCustomer(customerId, event, payload) {
        this.server.to(`customer:${customerId}`).emit(event, payload);
    }
    notifyDriver(driverId, event, payload) {
        this.server.to(`driver:${driverId}`).emit(event, payload);
    }
    notifyAdmin(event, payload) {
        this.server.to('admin').emit(event, payload);
    }
};
exports.DeliveryGateway = DeliveryGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], DeliveryGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('driver:location'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], DeliveryGateway.prototype, "handleDriverLocation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('delivery:confirm-otp'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], DeliveryGateway.prototype, "handleConfirmOtp", null);
exports.DeliveryGateway = DeliveryGateway = DeliveryGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: process.env.CLIENT_URL ?? 'http://localhost:4000', credentials: true },
        namespace: '/delivery',
    }),
    __param(2, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        typeorm_2.Repository])
], DeliveryGateway);
//# sourceMappingURL=delivery.gateway.js.map