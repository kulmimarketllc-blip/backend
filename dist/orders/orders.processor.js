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
var OrdersProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersProcessor = void 0;
const bull_1 = require("@nestjs/bull");
const notification_entity_1 = require("../database/entities/notification.entity");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const order_entity_1 = require("../database/entities/order.entity");
const user_entity_1 = require("../database/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const merchants_service_1 = require("../merchants/merchants.service");
let OrdersProcessor = OrdersProcessor_1 = class OrdersProcessor {
    constructor(ordersRepo, usersRepo, notifications, merchantsService) {
        this.ordersRepo = ordersRepo;
        this.usersRepo = usersRepo;
        this.notifications = notifications;
        this.merchantsService = merchantsService;
        this.logger = new common_1.Logger(OrdersProcessor_1.name);
    }
    async handleOrderConfirmed(job) {
        const { orderId, customerId, otp, total } = job.data;
        this.logger.log(`Processing order-confirmed job: ${orderId}`);
        const user = await this.usersRepo.findOneBy({ id: customerId });
        if (!user)
            return;
        await this.notifications.createNotification(customerId, 'Order Confirmed ✅', `Your order ${orderId} has been confirmed. Total: $${total}.`, notification_entity_1.NotificationType.ORDER, '/dashboard/orders');
        const order = await this.ordersRepo.findOne({
            where: { id: orderId },
            relations: ['items'],
        });
        if (order?.items) {
            const merchantIds = [...new Set(order.items.map(item => item.merchantId).filter(Boolean))];
            for (const mId of merchantIds) {
                const merchant = await this.merchantsService.findById(mId);
                if (!merchant?.userId)
                    continue;
                await this.notifications.createNotification(merchant.userId, '📦 New Order Received', `You have a new order to prepare: ${orderId}`, notification_entity_1.NotificationType.ORDER, '/merchant/orders');
            }
        }
        if (user.email) {
            await this.notifications.sendOrderConfirmation(user.email, orderId, total, otp);
        }
    }
    async handleStatusChanged(job) {
        const { orderId, newStatus, customerId } = job.data;
        this.logger.log(`Status changed: ${orderId} → ${newStatus}`);
        const user = await this.usersRepo.findOneBy({ id: customerId });
        if (!user)
            return;
        await this.notifications.createNotification(customerId, `Order ${newStatus.replace(/_/g, ' ').toUpperCase()}`, `Your order ${orderId} is now ${newStatus.replace(/_/g, ' ')}.`, notification_entity_1.NotificationType.ORDER, '/dashboard/orders');
        if (user.email) {
            await this.notifications.sendOrderStatusUpdate(user.email, orderId, newStatus);
        }
    }
    handleFailed(job, err) {
        this.logger.error(`Job failed: ${job.name} #${job.id} — ${err.message}`);
    }
};
exports.OrdersProcessor = OrdersProcessor;
__decorate([
    (0, bull_1.Process)('order-confirmed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersProcessor.prototype, "handleOrderConfirmed", null);
__decorate([
    (0, bull_1.Process)('status-changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrdersProcessor.prototype, "handleStatusChanged", null);
__decorate([
    (0, bull_1.OnQueueFailed)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Error]),
    __metadata("design:returntype", void 0)
], OrdersProcessor.prototype, "handleFailed", null);
exports.OrdersProcessor = OrdersProcessor = OrdersProcessor_1 = __decorate([
    (0, bull_1.Processor)('orders'),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_service_1.NotificationsService,
        merchants_service_1.MerchantsService])
], OrdersProcessor);
//# sourceMappingURL=orders.processor.js.map