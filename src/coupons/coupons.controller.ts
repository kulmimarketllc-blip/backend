import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';

import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/index';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, UserRole } from '../database/entities/user.entity';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ── POST /coupons/validate ─────────────────── (customer)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate coupon and get discount amount for a cart total' })
  validate(@Body() dto: ValidateCouponDto, @CurrentUser() user: User) {
    return this.couponsService.validate(dto, user.id);
  }

  // ── GET /coupons/expiring ──────────────────── (admin)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get('expiring')
  @ApiOperation({ summary: 'Admin: get coupons expiring within N days' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getExpiringSoon(@Query('days') days = 7) {
    return this.couponsService.getExpiringSoon(+days);
  }

  // ── GET /coupons ───────────────────────────── (admin)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Admin: list all coupons' })
  @ApiQuery({ name: 'page',   required: false })
  @ApiQuery({ name: 'limit',  required: false })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  findAll(
    @Query('page')   page   = 1,
    @Query('limit')  limit  = 20,
    @Query('active') active?: string,
  ) {
    const activeFilter = active === undefined ? undefined : active === 'true';
    return this.couponsService.findAll(+page, +limit, activeFilter);
  }

  // ── GET /coupons/:id ───────────────────────── (admin)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Admin: get coupon by ID' })
  findOne(@Param('id') id: string) {
    return this.couponsService.findOne(id);
  }

  // ── GET /coupons/code/:code ────────────────── (public preview)
  @Public()
  @Get('code/:code')
  @ApiOperation({ summary: 'Get basic coupon info by code (no validation)' })
  findByCode(@Param('code') code: string) {
    return this.couponsService.findByCode(code);
  }

  // ── GET /coupons/:id/stats ─────────────────── (admin)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Get(':id/stats')
  @ApiOperation({ summary: 'Admin: get coupon usage statistics' })
  getStats(@Param('id') id: string) {
    return this.couponsService.getUsageStats(id);
  }

  // ── POST /coupons ──────────────────────────── (admin)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Admin: create a new coupon' })
  create(@Body() dto: CreateCouponDto, @CurrentUser() user: User) {
    return this.couponsService.create(dto, user.id);
  }

  // ── PUT /coupons/:id ───────────────────────── (admin)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Admin: update a coupon' })
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  // ── PATCH /coupons/:id/deactivate ─────────── (admin)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin: deactivate a coupon' })
  deactivate(@Param('id') id: string) {
    return this.couponsService.deactivate(id);
  }

  // ── DELETE /coupons/:id ────────────────────── (admin)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin: delete a coupon (soft delete)' })
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
