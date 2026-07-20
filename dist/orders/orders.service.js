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
var OrdersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bull_1 = require("@nestjs/bull");
const bcrypt = __importStar(require("bcrypt"));
const ulid_1 = require("ulid");
const order_entity_1 = require("../database/entities/order.entity");
const product_entity_1 = require("../database/entities/product.entity");
const user_entity_1 = require("../database/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const sub_admin_features_entity_1 = require("../database/entities/sub-admin-features.entity");
const payments_service_1 = require("../payments/payments.service");
const merchants_service_1 = require("../merchants/merchants.service");
const SHIPPING_FEES = {
    [order_entity_1.ShippingMethod.FREE]: 0,
    [order_entity_1.ShippingMethod.EXPRESS]: 7.99,
    [order_entity_1.ShippingMethod.NEXT_DAY]: 19.99,
};
let OrdersService = OrdersService_1 = class OrdersService {
    constructor(ordersRepo, itemsRepo, productsRepo, disputeRepo, dataSource, notifications, paymentsService, merchantsService, ordersQueue) {
        this.ordersRepo = ordersRepo;
        this.itemsRepo = itemsRepo;
        this.productsRepo = productsRepo;
        this.disputeRepo = disputeRepo;
        this.dataSource = dataSource;
        this.notifications = notifications;
        this.paymentsService = paymentsService;
        this.merchantsService = merchantsService;
        this.ordersQueue = ordersQueue;
        this.logger = new common_1.Logger(OrdersService_1.name);
    }
    async create(dto, customerId) {
        const stockAlerts = [];
        const savedOrder = await this.dataSource.transaction(async (manager) => {
            const productIds = dto.items.map((i) => i.productId);
            const products = await manager.findByIds(product_entity_1.Product, productIds);
            const productMap = new Map(products.map((p) => [p.id, p]));
            let subtotal = 0;
            const itemsData = [];
            for (const item of dto.items) {
                const product = productMap.get(item.productId);
                if (!product)
                    throw new common_1.NotFoundException(`Product ${item.productId} not found`);
                if (product.stock < item.quantity) {
                    throw new common_1.BadRequestException(`Insufficient stock for "${product.name}" (available: ${product.stock})`);
                }
                const commissionRate = 0.08;
                const unitPrice = Number(product.price);
                const totalPrice = unitPrice * item.quantity;
                const commission = +(totalPrice * commissionRate).toFixed(2);
                itemsData.push({
                    productId: product.id,
                    merchantId: product.merchantId,
                    quantity: item.quantity,
                    unitPrice,
                    totalPrice,
                    commission,
                    merchantEarnings: +(totalPrice - commission).toFixed(2),
                    productName: product.name,
                    productImage: product.images?.[0],
                    variantId: item.variantId,
                });
                subtotal += totalPrice;
                const nextStock = Number(product.stock || 0) - item.quantity;
                await manager.decrement(product_entity_1.Product, { id: product.id }, 'stock', item.quantity);
                await manager.increment(product_entity_1.Product, { id: product.id }, 'totalSold', item.quantity);
                if (nextStock <= 0 && Number(product.stock || 0) > 0) {
                    stockAlerts.push({
                        kind: 'out_of_stock',
                        merchantId: product.merchantId,
                        productName: product.name,
                    });
                }
                else if (nextStock > 0 && nextStock <= Number(product.lowStockAt || 0) && Number(product.stock || 0) > Number(product.lowStockAt || 0)) {
                    stockAlerts.push({
                        kind: 'low_stock',
                        merchantId: product.merchantId,
                        productName: product.name,
                        stock: nextStock,
                    });
                }
            }
            const discount = dto.couponCode
                ? await this.applyCoupon(dto.couponCode, subtotal)
                : 0;
            const shippingFee = SHIPPING_FEES[dto.shippingMethod ?? order_entity_1.ShippingMethod.FREE] ?? 0;
            const total = +(subtotal - discount + shippingFee).toFixed(2);
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const otpHash = await bcrypt.hash(otp, 10);
            const orderId = this.generateOrderId();
            const order = manager.create(order_entity_1.Order, {
                id: orderId,
                customerId,
                addressId: dto.addressId,
                status: order_entity_1.OrderStatus.PENDING_PAYMENT,
                shippingMethod: dto.shippingMethod ?? order_entity_1.ShippingMethod.FREE,
                subtotal: +subtotal.toFixed(2),
                shippingFee,
                discount,
                total,
                couponCode: dto.couponCode,
                stripePaymentIntentId: dto.paymentIntentId,
                deliveryOtp: otpHash,
                statusHistory: [{ status: order_entity_1.OrderStatus.PENDING_PAYMENT, changedAt: new Date().toISOString() }],
                estimatedDelivery: this.calcEstimatedDelivery(dto.shippingMethod),
            });
            const savedOrder = await manager.save(order_entity_1.Order, order);
            const items = itemsData.map((i) => manager.create(order_entity_1.OrderItem, {
                id: (0, ulid_1.ulid)(),
                ...i,
                orderId: savedOrder.id,
            }));
            await manager.save(order_entity_1.OrderItem, items);
            await this.ordersQueue.add('order-confirmed', {
                orderId: savedOrder.id,
                customerId,
                otp,
                total,
            });
            this.logger.log(`Order created: ${savedOrder.id} · $${total} · ${dto.items.length} items`);
            return savedOrder;
        });
        for (const alert of stockAlerts) {
            if (alert.kind === 'out_of_stock') {
                await this.notifications.sendOutOfStockAlert(alert.merchantId, { name: alert.productName });
                continue;
            }
            await this.notifications.sendLowStockAlert(alert.merchantId, {
                name: alert.productName,
                stock: alert.stock,
            });
        }
        return savedOrder;
    }
    async updateStatus(orderId, newStatus, updatedBy, note) {
        const order = await this.findById(orderId);
        this.validateStatusTransition(order.status, newStatus, updatedBy.role);
        if (newStatus === order_entity_1.OrderStatus.CANCELLED) {
            if (updatedBy.role === user_entity_1.UserRole.MERCHANT) {
                newStatus = order_entity_1.OrderStatus.DISPUTED;
                await this.disputeRepo.save({
                    id: (0, ulid_1.ulid)(),
                    orderId: order.id,
                    customerId: order.customerId,
                    merchantId: order.items[0]?.merchantId,
                    reason: sub_admin_features_entity_1.DisputeReason.MERCHANT_CANCELLATION,
                    description: note || 'Merchant requested cancellation',
                    status: sub_admin_features_entity_1.DisputeStatus.PENDING,
                });
                this.logger.log(`Order ${orderId} cancellation by merchant ${updatedBy.id} converted to DISPUTE`);
            }
            else {
                await this.restoreOrderStock(order);
            }
        }
        if (newStatus === order_entity_1.OrderStatus.REFUNDED) {
            await this.restoreOrderStock(order);
        }
        const historyEntry = {
            status: newStatus,
            changedAt: new Date().toISOString(),
            changedBy: updatedBy.id,
            note,
        };
        await this.ordersRepo.update(orderId, {
            status: newStatus,
            statusHistory: [...(order.statusHistory ?? []), historyEntry],
            ...(newStatus === order_entity_1.OrderStatus.DELIVERED ? { deliveredAt: new Date() } : {}),
            ...(newStatus === order_entity_1.OrderStatus.CANCELLED ? { cancelledAt: new Date(), cancelReason: note } : {}),
        });
        if (newStatus === order_entity_1.OrderStatus.DELIVERED) {
            for (const item of order.items || []) {
                if (item.merchantId && item.merchantEarnings > 0) {
                    await this.merchantsService.creditEarnings(item.merchantId, item.merchantEarnings);
                    this.logger.log(`Credited $${item.merchantEarnings} to merchant ${item.merchantId} for order ${orderId}`);
                }
            }
        }
        await this.ordersQueue.add('status-changed', {
            orderId, newStatus, customerId: order.customerId,
        });
        return { orderId, status: newStatus };
    }
    async refundOrder(orderId, updatedBy, note) {
        const order = await this.findById(orderId);
        if (order.status === order_entity_1.OrderStatus.REFUNDED) {
            throw new common_1.BadRequestException('Order is already refunded');
        }
        if (order.stripePaymentIntentId) {
            try {
                await this.paymentsService.createRefund(order.stripePaymentIntentId);
                this.logger.log(`Stripe refund initiated for order ${orderId}`);
            }
            catch (err) {
                const errMsg = err instanceof Error ? err.message : 'Unknown error';
                this.logger.error(`Refund failed for order ${orderId}: ${errMsg}`);
                if (errMsg.includes('No such payment_intent') || errMsg.includes('has not been captured')) {
                    this.logger.warn(`Proceeding with order refund despite Stripe failure (Testing/Mock data detected)`);
                }
                else {
                    throw new common_1.BadRequestException(`Stripe refund failed: ${errMsg}`);
                }
            }
        }
        if (order.status === order_entity_1.OrderStatus.DELIVERED) {
            for (const item of order.items || []) {
                if (item.merchantId && item.merchantEarnings > 0) {
                    await this.merchantsService.debitEarnings(item.merchantId, item.merchantEarnings);
                    this.logger.log(`Deducted $${item.merchantEarnings} from merchant ${item.merchantId} due to refund/cancellation`);
                }
            }
        }
        return this.updateStatus(orderId, order_entity_1.OrderStatus.REFUNDED, updatedBy, note);
    }
    async getTracking(orderId, requesterId) {
        const order = await this.ordersRepo.findOne({
            where: { id: orderId },
            relations: ['driver', 'address'],
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        if (order.customerId !== requesterId)
            throw new common_1.ForbiddenException();
        return {
            orderId: order.id,
            status: order.status,
            estimatedDelivery: order.estimatedDelivery,
            deliveredAt: order.deliveredAt,
            driver: order.driver
                ? {
                    name: `${order.driver.firstName} ${order.driver.lastName}`,
                    phone: order.driver.phone,
                }
                : null,
            timeline: order.statusHistory ?? [],
        };
    }
    async findByCustomer(customerId, page = 1, limit = 10) {
        const [data, total] = await this.ordersRepo.findAndCount({
            where: { customerId },
            relations: ['items'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async findByMerchant(merchantId, page = 1, limit = 20) {
        const [data, total] = await this.itemsRepo.findAndCount({
            where: { merchantId },
            relations: ['order', 'order.customer', 'order.address'],
            order: { order: { createdAt: 'DESC' } },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { data, meta: { total, page, limit } };
    }
    async findById(id) {
        const order = await this.ordersRepo.findOne({
            where: { id }, relations: ['items'],
        });
        if (!order)
            throw new common_1.NotFoundException(`Order ${id} not found`);
        return order;
    }
    generateOrderId() {
        const year = new Date().getFullYear();
        const seq = Math.floor(10000 + Math.random() * 90000);
        return `ESQ-${year}-${seq}`;
    }
    calcEstimatedDelivery(method) {
        const d = new Date();
        const days = method === order_entity_1.ShippingMethod.NEXT_DAY ? 1
            : method === order_entity_1.ShippingMethod.EXPRESS ? 2 : 5;
        d.setDate(d.getDate() + days);
        return d;
    }
    async applyCoupon(code, subtotal) {
        if (code === 'ESUUQ10')
            return +(subtotal * 0.10).toFixed(2);
        if (code === 'SAVE10')
            return 10;
        return 0;
    }
    async restoreOrderStock(order) {
        for (const item of order.items ?? []) {
            if (!item?.productId || !item.quantity)
                continue;
            await this.productsRepo.increment({ id: item.productId }, 'stock', item.quantity);
            await this.productsRepo.decrement({ id: item.productId }, 'totalSold', item.quantity);
        }
    }
    validateStatusTransition(current, next, role) {
        const allowed = {
            [order_entity_1.OrderStatus.PENDING_PAYMENT]: [
                order_entity_1.OrderStatus.CONFIRMED,
                order_entity_1.OrderStatus.CANCELLED,
            ],
            [order_entity_1.OrderStatus.CONFIRMED]: [
                order_entity_1.OrderStatus.PROCESSING,
                order_entity_1.OrderStatus.CANCELLED,
            ],
            [order_entity_1.OrderStatus.PROCESSING]: [
                order_entity_1.OrderStatus.READY_PICKUP,
                order_entity_1.OrderStatus.CANCELLED,
            ],
            [order_entity_1.OrderStatus.READY_PICKUP]: [
                order_entity_1.OrderStatus.PICKED_UP,
            ],
            [order_entity_1.OrderStatus.PICKED_UP]: [
                order_entity_1.OrderStatus.IN_TRANSIT,
            ],
            [order_entity_1.OrderStatus.IN_TRANSIT]: [
                order_entity_1.OrderStatus.DELIVERED,
            ],
            [order_entity_1.OrderStatus.DELIVERED]: [
                order_entity_1.OrderStatus.RETURN_REQUESTED,
            ],
            [order_entity_1.OrderStatus.RETURN_REQUESTED]: [
                order_entity_1.OrderStatus.RETURNED,
            ],
            [order_entity_1.OrderStatus.RETURNED]: [
                order_entity_1.OrderStatus.REFUNDED,
            ],
            [order_entity_1.OrderStatus.DISPUTED]: [
                order_entity_1.OrderStatus.CANCELLED,
                order_entity_1.OrderStatus.REFUNDED,
            ],
        };
        if (role === user_entity_1.UserRole.MERCHANT && next === order_entity_1.OrderStatus.CANCELLED) {
        }
        else if (!allowed[current]?.includes(next)) {
            throw new common_1.BadRequestException(`Cannot transition order from "${current}" to "${next}"`);
        }
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = OrdersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __param(1, (0, typeorm_1.InjectRepository)(order_entity_1.OrderItem)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(3, (0, typeorm_1.InjectRepository)(sub_admin_features_entity_1.Dispute)),
    __param(8, (0, bull_1.InjectQueue)('orders')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        notifications_service_1.NotificationsService,
        payments_service_1.PaymentsService,
        merchants_service_1.MerchantsService, Object])
], OrdersService);
//# sourceMappingURL=orders.service.js.map