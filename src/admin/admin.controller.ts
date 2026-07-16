import { Controller, Get, Query, UseGuards, Patch, Body, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { OrderStatus, ShippingMethod } from '../database/entities/order.entity';
import { ProductStatus } from '../database/entities/product.entity';
import { MerchantStatus } from '../database/entities/supporting.entities';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  @Get('dashboard')
  @ApiOperation({ summary: 'Platform dashboard — users, orders, revenue, charts' })
  getDashboard() { return this.adminService.getDashboardStats(); }

  @Get('health')
  @ApiOperation({ summary: 'Platform health alerts — stuck orders, low stock, pending merchants' })
  getHealth() { return this.adminService.getPlatformHealth(); }

  @Get('orders')
  @ApiOperation({ summary: 'All orders with filters' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'search', required: false })
  getOrders(
    @Query('page') page = 1, @Query('limit') limit = 20,
    @Query('status') status?: OrderStatus, @Query('search') search?: string,
  ) { return this.adminService.getOrders(+page, +limit, status, search); }

  @Get('orders/counts')
  @ApiOperation({ summary: 'Live order status counts for admin tabs' })
  getOrderCounts() {
    return this.adminService.getOrderStatusCounts();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Revenue report with merchant and category breakdown' })
  @ApiQuery({ name: 'period', enum: ['week', 'month', 'quarter', 'year'], required: false })
  getRevenue(@Query('period') period: any = 'month') {
    return this.adminService.getRevenueReport(period);
  }

  @Get('products/pending')
  @ApiOperation({ summary: 'Products awaiting review/approval' })
  getPendingProducts(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getPendingProducts(+page, +limit);
  }

  @Get('products')
  @ApiOperation({ summary: 'All products with filters' })
  @ApiQuery({ name: 'status', enum: ProductStatus, required: false })
  @ApiQuery({ name: 'search', required: false })
  getProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: ProductStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.getProducts(+page, +limit, status, search);
  }

  @Patch('products/:id/approve')
  @ApiOperation({ summary: 'Approve a pending product' })
  approveProduct(@Param('id') id: string) {
    return this.adminService.approveProduct(id);
  }

  @Patch('products/:id/reject')
  @ApiOperation({ summary: 'Reject a pending product' })
  rejectProduct(@Param('id') id: string) {
    return this.adminService.rejectProduct(id);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product from admin moderation queue' })
  removeProduct(@Param('id') id: string) {
    return this.adminService.removeProduct(id);
  }

  @Get('merchants')
  @ApiOperation({ summary: 'Merchants with filters and performance stats' })
  @ApiQuery({ name: 'status', enum: MerchantStatus, required: false })
  @ApiQuery({ name: 'search', required: false })
  getMerchants(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: MerchantStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.getMerchants(+page, +limit, status, search);
  }

  @Get('customers')
  @ApiOperation({ summary: 'Customers with spending and order stats' })
  @ApiQuery({ name: 'status', enum: ['active', 'inactive'], required: false })
  @ApiQuery({ name: 'search', required: false })
  getCustomers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: 'active' | 'inactive',
    @Query('search') search?: string,
  ) {
    return this.adminService.getCustomers(+page, +limit, status, search);
  }

  @Get('delivery')
  @ApiOperation({ summary: 'Delivery partners with status and workload' })
  @ApiQuery({ name: 'status', enum: ['online', 'busy', 'offline'], required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'shippingMethod', enum: ShippingMethod, required: false })
  getDeliveryPartners(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: 'online' | 'busy' | 'offline',
    @Query('search') search?: string,
  ) {
    return this.adminService.getDeliveryPartners(+page, +limit, status, search);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings used by admin console' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings used by admin console' })
  updateSettings(
    @Body() payload: Record<string, any>,
    @CurrentUser() user: User,
  ) {
    return this.adminService.updateSettings(payload, user.id);
  }
}
