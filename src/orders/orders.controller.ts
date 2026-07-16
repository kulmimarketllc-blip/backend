import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus, NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { OrderStatus } from '../database/entities/order.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { MerchantsService } from '../merchants/merchants.service';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly merchantsService: MerchantsService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Place a new order' })
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: User) {
    return this.ordersService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get my orders' })
  findMine(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.ordersService.findByCustomer(user.id, +page, +limit);
  }

  @Get('merchant/me')
  @ApiOperation({ summary: 'Get orders containing current merchant products' })
  async findMerchantOrders(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const merchant = await this.merchantsService.findByUserId(user.id);
    if (!merchant?.id) {
      throw new NotFoundException('No merchant store found for this user');
    }
    return this.ordersService.findByMerchant(merchant.id, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.findById(id);
  }

  @Get(':id/track')
  @ApiOperation({ summary: 'Get live order tracking' })
  track(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.getTracking(id, user.id);
  }

  @Put(':id/status')
  @Roles(UserRole.MERCHANT, UserRole.DELIVERY_PARTNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus; note?: string },
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateStatus(id, body.status, user, body.note);
  }
}

