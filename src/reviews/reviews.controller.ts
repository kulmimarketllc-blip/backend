import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery,
} from '@nestjs/swagger';

import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto, UpdateReviewDto, MerchantReplyDto,
  ModerateReviewDto, ReviewQueryDto,
} from './dto/index';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { ReviewStatus } from '../database/entities/review-coupon.entities';
import { MerchantsService } from '../merchants/merchants.service';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly merchantsService: MerchantsService,
  ) {}

  // ── POST /reviews ─────────────────────────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Create a product review (verified purchases only)' })
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: User) {
    return this.reviewsService.create(dto, user);
  }

  // ── GET /reviews/product/:productId ──────────
  @Public()
  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all reviews for a product with rating breakdown' })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  findByProduct(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findByProduct(productId, query);
  }

  // ── GET /reviews/product/:productId/breakdown ─
  @Public()
  @Get('product/:productId/breakdown')
  @ApiOperation({ summary: 'Get rating breakdown for a product' })
  getRatingBreakdown(@Param('productId') productId: string) {
    return this.reviewsService.getRatingBreakdown(productId);
  }

  // ── GET /reviews/merchant/:merchantId ─────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('merchant/:merchantId')
  @ApiOperation({ summary: 'Get all reviews for a merchant store' })
  findByMerchant(
    @Param('merchantId') merchantId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewsService.findByMerchant(merchantId, query);
  }

  // ── GET /reviews/:id ──────────────────────────
  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single review by ID' })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  // ── PUT /reviews/:id ──────────────────────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiOperation({ summary: 'Update own review (within 48 hours)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.update(id, dto, user);
  }

  // ── DELETE /reviews/:id ───────────────────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a review (owner or admin)' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reviewsService.remove(id, user);
  }

  // ── POST /reviews/:id/reply ───────────────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post(':id/reply')
  @ApiOperation({ summary: 'Merchant replies to a review' })
  async addReply(
    @Param('id') id: string,
    @Body() dto: MerchantReplyDto,
    @CurrentUser() user: User,
  ) {
    const merchant = await this.merchantsService.findByUserId(user.id);
    if (!merchant?.id) {
      throw new NotFoundException('No merchant store found for this user');
    }
    return this.reviewsService.addMerchantReply(id, dto, merchant.id);
  }

  // ── PUT /reviews/:id/reply ────────────────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Put(':id/reply')
  @ApiOperation({ summary: 'Merchant updates their reply' })
  async updateReply(
    @Param('id') id: string,
    @Body() dto: MerchantReplyDto,
    @CurrentUser() user: User,
  ) {
    const merchant = await this.merchantsService.findByUserId(user.id);
    if (!merchant?.id) {
      throw new NotFoundException('No merchant store found for this user');
    }
    return this.reviewsService.updateMerchantReply(id, dto, merchant.id);
  }

  // ── POST /reviews/:id/helpful ─────────────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post(':id/helpful')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle helpful vote on a review' })
  markHelpful(@Param('id') id: string, @CurrentUser() user: User) {
    return this.reviewsService.markHelpful(id, user.id);
  }

  // ── PATCH /reviews/:id/moderate ───────────────
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/moderate')
  @ApiOperation({ summary: 'Admin: approve / reject / flag a review' })
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewsService.moderate(id, dto.status as ReviewStatus, user.id);
  }

  @Post(':id/flag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flag review for moderation' })
  flag(@Param('id') id: string) {
    return this.reviewsService.flag(id);
  }
}
