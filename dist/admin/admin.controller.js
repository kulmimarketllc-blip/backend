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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const user_entity_1 = require("../database/entities/user.entity");
const order_entity_1 = require("../database/entities/order.entity");
const product_entity_1 = require("../database/entities/product.entity");
const supporting_entities_1 = require("../database/entities/supporting.entities");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    getDashboard() { return this.adminService.getDashboardStats(); }
    getHealth() { return this.adminService.getPlatformHealth(); }
    getOrders(page = 1, limit = 20, status, search) { return this.adminService.getOrders(+page, +limit, status, search); }
    getOrderCounts() {
        return this.adminService.getOrderStatusCounts();
    }
    getRevenue(period = 'month') {
        return this.adminService.getRevenueReport(period);
    }
    getPendingProducts(page = 1, limit = 20) {
        return this.adminService.getPendingProducts(+page, +limit);
    }
    getProducts(page = 1, limit = 20, status, search) {
        return this.adminService.getProducts(+page, +limit, status, search);
    }
    approveProduct(id) {
        return this.adminService.approveProduct(id);
    }
    rejectProduct(id) {
        return this.adminService.rejectProduct(id);
    }
    removeProduct(id) {
        return this.adminService.removeProduct(id);
    }
    getMerchants(page = 1, limit = 20, status, search) {
        return this.adminService.getMerchants(+page, +limit, status, search);
    }
    getCustomers(page = 1, limit = 20, status, search) {
        return this.adminService.getCustomers(+page, +limit, status, search);
    }
    getDeliveryPartners(page = 1, limit = 20, status, search) {
        return this.adminService.getDeliveryPartners(+page, +limit, status, search);
    }
    getSettings() {
        return this.adminService.getSettings();
    }
    updateSettings(payload, user) {
        return this.adminService.updateSettings(payload, user.id);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform dashboard — users, orders, revenue, charts' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform health alerts — stuck orders, low stock, pending merchants' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('orders'),
    (0, swagger_1.ApiOperation)({ summary: 'All orders with filters' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: order_entity_1.OrderStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getOrders", null);
__decorate([
    (0, common_1.Get)('orders/counts'),
    (0, swagger_1.ApiOperation)({ summary: 'Live order status counts for admin tabs' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getOrderCounts", null);
__decorate([
    (0, common_1.Get)('revenue'),
    (0, swagger_1.ApiOperation)({ summary: 'Revenue report with merchant and category breakdown' }),
    (0, swagger_1.ApiQuery)({ name: 'period', enum: ['week', 'month', 'quarter', 'year'], required: false }),
    __param(0, (0, common_1.Query)('period')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getRevenue", null);
__decorate([
    (0, common_1.Get)('products/pending'),
    (0, swagger_1.ApiOperation)({ summary: 'Products awaiting review/approval' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPendingProducts", null);
__decorate([
    (0, common_1.Get)('products'),
    (0, swagger_1.ApiOperation)({ summary: 'All products with filters' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: product_entity_1.ProductStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getProducts", null);
__decorate([
    (0, common_1.Patch)('products/:id/approve'),
    (0, swagger_1.ApiOperation)({ summary: 'Approve a pending product' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approveProduct", null);
__decorate([
    (0, common_1.Patch)('products/:id/reject'),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a pending product' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "rejectProduct", null);
__decorate([
    (0, common_1.Delete)('products/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Delete product from admin moderation queue' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "removeProduct", null);
__decorate([
    (0, common_1.Get)('merchants'),
    (0, swagger_1.ApiOperation)({ summary: 'Merchants with filters and performance stats' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: supporting_entities_1.MerchantStatus, required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getMerchants", null);
__decorate([
    (0, common_1.Get)('customers'),
    (0, swagger_1.ApiOperation)({ summary: 'Customers with spending and order stats' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: ['active', 'inactive'], required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCustomers", null);
__decorate([
    (0, common_1.Get)('delivery'),
    (0, swagger_1.ApiOperation)({ summary: 'Delivery partners with status and workload' }),
    (0, swagger_1.ApiQuery)({ name: 'status', enum: ['online', 'busy', 'offline'], required: false }),
    (0, swagger_1.ApiQuery)({ name: 'search', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'shippingMethod', enum: order_entity_1.ShippingMethod, required: false }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getDeliveryPartners", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform settings used by admin console' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update platform settings used by admin console' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_entity_1.User]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateSettings", null);
exports.AdminController = AdminController = __decorate([
    (0, swagger_1.ApiTags)('admin'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_entity_1.UserRole.ADMIN),
    (0, common_1.Controller)('admin'),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map