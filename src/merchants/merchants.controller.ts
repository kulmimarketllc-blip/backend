// merchants/merchants.controller.ts
import {
  Controller, Get, Post, Put, Patch, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus, NotFoundException,
  UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MerchantsService } from './merchants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { MerchantStatus } from '../database/entities/supporting.entities';
import { fileUrl, multerOptions } from '../uploads/multer.config';

class RegisterMerchantDto {
  @ApiProperty({ example: 'Aisha Electronics' }) @IsString() storeName!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() businessInfo?: any;
}

class UpdateStoreDto {
  @ApiPropertyOptional() @IsOptional() @IsString() storeName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bannerUrl?: string;
  @ApiPropertyOptional() @IsOptional() businessInfo?: any;
  @ApiPropertyOptional() @IsOptional() @IsNumber() returnPolicyDays?: number;
}

class PayoutRequestDto {
  @ApiProperty({ example: 150.00 }) @IsNumber() @Min(20) amount!: number;
}

class ConnectBankAccountDto {
  @ApiProperty({ example: 'acct_1NXXXXXXXXXXXXXXXX' })
  @IsString()
  @Length(6, 120)
  stripeAccountId!: string;

  @ApiPropertyOptional({ example: 'Chase Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '4291' })
  @IsOptional()
  @IsString()
  @Length(4, 4)
  accountLast4?: string;
}

class ConnectStripeOnboardingDto {
  @ApiPropertyOptional({ example: 'http://localhost:4000/merchant/payouts?stripe_onboarding=refresh' })
  @IsOptional()
  @IsString()
  refreshUrl?: string;

  @ApiPropertyOptional({ example: 'http://localhost:4000/merchant/payouts?stripe_onboarding=success' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

@ApiTags('merchants')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('merchants')
export class MerchantsController {
  constructor(
    private readonly merchantsService: MerchantsService,
    private readonly config: ConfigService,
  ) { }

  // ── Public ─────────────────────────────────────
  @Public()
  @Get('store/:slug')
  @ApiOperation({ summary: 'Get merchant store by slug (public)' })
  findBySlug(@Param('slug') slug: string) { return this.merchantsService.findBySlug(slug); }

  // ── Merchant-facing ────────────────────────────
  @Post('register')
  @ApiOperation({ summary: 'Register a new merchant store' })
  register(@CurrentUser() user: User, @Body() dto: RegisterMerchantDto) {
    return this.merchantsService.register(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: "Get own merchant store" })
  getMyStore(@CurrentUser() user: User) { return this.merchantsService.findByUserId(user.id); }

  // UPDATED: Supports both JSON and file upload for logo & banner in same API
  @Put('me')
  @ApiOperation({ summary: 'Update store profile with logo & banner upload' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        storeName: { type: 'string' },
        description: { type: 'string' },
        returnPolicyDays: { type: 'number' },
        businessInfo: { type: 'object' },
        logo: {
          type: 'string',
          format: 'binary',
          description: 'Store logo image file (optional)',
        },
        banner: {
          type: 'string',
          format: 'binary',
          description: 'Store banner image file (optional)',
        },
      },
    },
  })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ], multerOptions('merchants')))
  async updateStore(
    @CurrentUser() user: User,
    @Body() dto: UpdateStoreDto,
    @UploadedFiles() files?: { logo?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const merchant = await this.merchantsService.findByUserId(user.id);
    if (!merchant) throw new NotFoundException('No merchant store found');

    const baseUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');

    // Process logo if uploaded
    if (files?.logo && files.logo.length > 0) {
      const logoUrl = fileUrl(baseUrl, 'merchants', files.logo[0].filename);
      dto.logoUrl = logoUrl;
    }

    // Process banner if uploaded
    if (files?.banner && files.banner.length > 0) {
      const bannerUrl = fileUrl(baseUrl, 'merchants', files.banner[0].filename);
      dto.bannerUrl = bannerUrl;
    }

    // Clean up any undefined values from multipart parsing
    if (dto.storeName === 'undefined') dto.storeName = undefined;
    if (dto.description === 'undefined') dto.description = undefined;
    if (dto.returnPolicyDays === undefined || dto.returnPolicyDays === null) {
      // Keep existing value, don't set to undefined
      delete dto.returnPolicyDays;
    }

    return this.merchantsService.updateStore(merchant.id, user.id, dto);
  }

  @Patch('me/toggle-online')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle store online / offline status' })
  toggleOnline(@CurrentUser() user: User) {
    return this.merchantsService.findByUserId(user.id).then((m) => {
      if (!m) throw new NotFoundException('No merchant store found');
      return this.merchantsService.toggleOnline(m.id, user.id);
    });
  }

  @Get('me/earnings')
  @ApiOperation({ summary: 'Get earnings dashboard' })
  @ApiQuery({ name: 'period', enum: ['week', 'month', 'year'], required: false })
  getEarnings(@CurrentUser() user: User, @Query('period') period: any = 'month') {
    return this.merchantsService.findByUserId(user.id).then((m) => {
      if (!m) throw new NotFoundException('No merchant store found');
      return this.merchantsService.getEarnings(m.id, period);
    });
  }

  @Post('me/payout')
  @ApiOperation({ summary: 'Request a payout to connected bank account' })
  requestPayout(@CurrentUser() user: User, @Body() dto: PayoutRequestDto) {
    return this.merchantsService.findByUserId(user.id).then((m) => {
      if (!m) throw new NotFoundException('No merchant store found');
      return this.merchantsService.requestPayout(m.id, user.id, dto.amount);
    });
  }

  @Get('me/payout-history')
  @ApiOperation({ summary: 'Get merchant payout transfer history' })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  getPayoutHistory(@CurrentUser() user: User, @Query('limit') limit = 20) {
    return this.merchantsService.findByUserId(user.id).then((m) => {
      if (!m) throw new NotFoundException('No merchant store found');
      return this.merchantsService.getPayoutHistory(m.id, user.id, +limit);
    });
  }

  @Post('me/connect-account')
  @ApiOperation({ summary: 'Create Stripe Connect account (if needed) and return hosted onboarding link' })
  createConnectAccount(@CurrentUser() user: User, @Body() dto: ConnectStripeOnboardingDto = {}) {
    return this.merchantsService.findByUserId(user.id).then((m) => {
      if (!m) throw new NotFoundException('No merchant store found');
      return this.merchantsService.createConnectAccount(m.id, user.id, user.email, {
        refreshUrl: dto.refreshUrl,
        returnUrl: dto.returnUrl,
      });
    });
  }

  @Patch('me/bank-account')
  @ApiOperation({ summary: 'Connect or update merchant bank account details' })
  connectBankAccount(@CurrentUser() user: User, @Body() dto: ConnectBankAccountDto) {
    return this.merchantsService.findByUserId(user.id).then((m) => {
      if (!m) throw new NotFoundException('No merchant store found');
      return this.merchantsService.connectBankAccount(m.id, user.id, dto);
    });
  }

  // ── Admin ──────────────────────────────────────
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
  @ApiOperation({ summary: 'Admin: list all merchants' })
  @ApiQuery({ name: 'status', enum: MerchantStatus, required: false })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: MerchantStatus) {
    return this.merchantsService.findAll(+page, +limit, status);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUB_ADMIN)
  @ApiOperation({ summary: 'Admin: get merchant by ID' })
  findOne(@Param('id') id: string) { return this.merchantsService.findById(id); }

  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: approve a merchant' })
  approve(@Param('id') id: string, @Body() body: { commissionRate?: number }) {
    return this.merchantsService.approve(id, body.commissionRate);
  }

  @Patch(':id/suspend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: suspend a merchant' })
  suspend(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.merchantsService.suspend(id, body.reason);
  }

  @Patch(':id/commission')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: set merchant commission rate' })
  setCommission(@Param('id') id: string, @Body() body: { rate: number }) {
    return this.merchantsService.setCommissionRate(id, body.rate);
  }
}