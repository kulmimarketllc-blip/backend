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
exports.OrderItem = exports.Order = exports.ShippingMethod = exports.OrderStatus = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const supporting_entities_1 = require("./supporting.entities");
const product_entity_1 = require("./product.entity");
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING_PAYMENT"] = "pending_payment";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["READY_PICKUP"] = "ready_for_pickup";
    OrderStatus["PICKED_UP"] = "picked_up";
    OrderStatus["IN_TRANSIT"] = "in_transit";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["RETURN_REQUESTED"] = "return_requested";
    OrderStatus["RETURNED"] = "returned";
    OrderStatus["REFUNDED"] = "refunded";
    OrderStatus["DISPUTED"] = "disputed";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var ShippingMethod;
(function (ShippingMethod) {
    ShippingMethod["FREE"] = "free";
    ShippingMethod["EXPRESS"] = "express";
    ShippingMethod["NEXT_DAY"] = "next_day";
})(ShippingMethod || (exports.ShippingMethod = ShippingMethod = {}));
let Order = class Order {
    setTimestamps() {
        const now = new Date();
        this.createdAt = now;
        this.updatedAt = now;
    }
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.Column)({ primary: true, length: 20 }),
    __metadata("design:type", String)
], Order.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', length: 26 }),
    __metadata("design:type", String)
], Order.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'driver_id', length: 26, nullable: true }),
    __metadata("design:type", String)
], Order.prototype, "driverId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'address_id', length: 26 }),
    __metadata("design:type", String)
], Order.prototype, "addressId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ShippingMethod, default: ShippingMethod.FREE, name: 'shipping_method' }),
    __metadata("design:type", String)
], Order.prototype, "shippingMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Order.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'shipping_fee' }),
    __metadata("design:type", Number)
], Order.prototype, "shippingFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "discount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Order.prototype, "total", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'coupon_code', length: 30 }),
    __metadata("design:type", String)
], Order.prototype, "couponCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'stripe_payment_intent_id' }),
    __metadata("design:type", String)
], Order.prototype, "stripePaymentIntentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'delivery_otp' }),
    __metadata("design:type", String)
], Order.prototype, "deliveryOtp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', default: [], name: 'status_history' }),
    __metadata("design:type", Array)
], Order.prototype, "statusHistory", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'estimated_delivery' }),
    __metadata("design:type", Date)
], Order.prototype, "estimatedDelivery", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'delivered_at' }),
    __metadata("design:type", Date)
], Order.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'cancelled_at' }),
    __metadata("design:type", Date)
], Order.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'cancel_reason' }),
    __metadata("design:type", String)
], Order.prototype, "cancelReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'created_at' }),
    __metadata("design:type", Date)
], Order.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', name: 'updated_at' }),
    __metadata("design:type", Date)
], Order.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (u) => u.orders),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", user_entity_1.User)
], Order.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'driver_id' }),
    __metadata("design:type", user_entity_1.User)
], Order.prototype, "driver", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => supporting_entities_1.Address),
    (0, typeorm_1.JoinColumn)({ name: 'address_id' }),
    __metadata("design:type", supporting_entities_1.Address)
], Order.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => OrderItem, (item) => item.order, { cascade: true }),
    __metadata("design:type", Array)
], Order.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Order.prototype, "setTimestamps", null);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)('orders'),
    (0, typeorm_1.Index)(['customerId']),
    (0, typeorm_1.Index)(['driverId']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['createdAt'])
], Order);
let OrderItem = class OrderItem {
};
exports.OrderItem = OrderItem;
__decorate([
    (0, typeorm_1.Column)({ primary: true, length: 26 }),
    __metadata("design:type", String)
], OrderItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id', length: 20 }),
    __metadata("design:type", String)
], OrderItem.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id', length: 26 }),
    __metadata("design:type", String)
], OrderItem.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'merchant_id', length: 26 }),
    __metadata("design:type", String)
], OrderItem.prototype, "merchantId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Number)
], OrderItem.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "unitPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "totalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'variant_id' }),
    __metadata("design:type", String)
], OrderItem.prototype, "variantId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'variant_snapshot' }),
    __metadata("design:type", Object)
], OrderItem.prototype, "variantSnapshot", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_name' }),
    __metadata("design:type", String)
], OrderItem.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, name: 'product_image' }),
    __metadata("design:type", String)
], OrderItem.prototype, "productImage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "commission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'merchant_earnings' }),
    __metadata("design:type", Number)
], OrderItem.prototype, "merchantEarnings", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Order, (o) => o.items),
    (0, typeorm_1.JoinColumn)({ name: 'order_id' }),
    __metadata("design:type", Order)
], OrderItem.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], OrderItem.prototype, "product", void 0);
exports.OrderItem = OrderItem = __decorate([
    (0, typeorm_1.Entity)('order_items')
], OrderItem);
//# sourceMappingURL=order.entity.js.map