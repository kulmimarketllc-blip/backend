import {
  Controller, Get, Patch, Post, Body, Param,
  Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SubAdminService } from './sub-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { Merchant } from '../database/entities/supporting.entities';
import { ApproveMerchantDto } from './dto/approve-merchant.dto';
import { RejectMerchantDto } from './dto/reject-merchant.dto';
import { ListPendingMerchantsDto } from './dto/list-pending-merchants.dto';
import { ListFlaggedReviewsDto } from './dto/list-flagged-reviews.dto';
import { ReviewModerationDto } from './dto/review-moderation.dto';
import { ListFlaggedContentDto } from './dto/list-flagged-content.dto';
import { ContentModerationDto } from './dto/content-moderation.dto';
import { Review } from '../database/entities/review-coupon.entities';
import { Product } from '../database/entities/product.entity';
import { UserModerationDto } from './dto/user-moderation.dto';
import { ResolveDisputeDto, DisputeNoteDto } from './dto/dispute.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { DisputeStatus } from '../database/entities/sub-admin-features.entity';

@ApiTags('sub-admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.SUB_ADMIN, UserRole.ADMIN)
@Controller('sub-admin')
export class SubAdminController {
  constructor(private readonly subAdminService: SubAdminService) {}

  // ── Merchant Approval Queue ──────────────────────

  @Get('merchants/pending')
  @ApiOperation({ summary: 'List pending merchants awaiting approval' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of pending merchants with user details',
  })
  async listPendingMerchants(
    @Query() query: ListPendingMerchantsDto,
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.listPendingMerchants(query, requester);
  }

  @Get('merchants/pending/count')
  @ApiOperation({ summary: 'Get total count of pending merchants' })
  @ApiResponse({
    status: 200,
    description: 'Number of pending merchants awaiting approval',
    schema: { example: { count: 5 } },
  })
  async getPendingMerchantsCount(@CurrentUser() requester: User) {
    const count = await this.subAdminService.getPendingMerchantsCount(requester);
    return { count };
  }

  @Get('merchants/:id')
  @ApiOperation({ summary: 'Get merchant detail for moderation review' })
  @ApiResponse({
    status: 200,
    description: 'Merchant details with business information',
  })
  async getMerchantDetail(
    @Param('id') merchantId: string,
    @CurrentUser() requester: User,
  ): Promise<Merchant> {
    return this.subAdminService.getMerchantForModeration(merchantId, requester);
  }

  @Patch('merchants/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending merchant' })
  @ApiResponse({
    status: 200,
    description: 'Merchant approved successfully',
  })
  async approveMerchant(
    @Param('id') merchantId: string,
    @Body() dto: ApproveMerchantDto,
    @CurrentUser() requester: User,
  ): Promise<Merchant> {
    return this.subAdminService.approveMerchant(merchantId, dto, requester);
  }

  @Patch('merchants/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending merchant' })
  @ApiResponse({
    status: 200,
    description: 'Merchant rejected successfully',
  })
  async rejectMerchant(
    @Param('id') merchantId: string,
    @Body() dto: RejectMerchantDto,
    @CurrentUser() requester: User,
  ): Promise<Merchant> {
    return this.subAdminService.rejectMerchant(merchantId, dto, requester);
  }

  // ── Review Moderation Queue ──────────────────────

  @Get('moderation/flagged-reviews')
  @ApiOperation({ summary: 'List flagged reviews awaiting moderation' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of flagged reviews with product and user details',
  })
  async listFlaggedReviews(
    @Query() query: ListFlaggedReviewsDto,
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.listFlaggedReviews(query, requester);
  }

  @Get('moderation/flagged-reviews/count')
  @ApiOperation({ summary: 'Get total count of flagged reviews' })
  @ApiResponse({
    status: 200,
    description: 'Number of flagged reviews awaiting moderation',
    schema: { example: { count: 3 } },
  })
  async getFlaggedReviewsCount(@CurrentUser() requester: User) {
    const count = await this.subAdminService.getFlaggedReviewsCount(requester);
    return { count };
  }

  @Patch('moderation/reviews/:id/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Take moderation action on a flagged review' })
  @ApiResponse({
    status: 200,
    description: 'Review moderation action completed',
  })
  async moderateReview(
    @Param('id') reviewId: string,
    @Body() dto: ReviewModerationDto,
    @CurrentUser() requester: User,
  ): Promise<Review> {
    return this.subAdminService.moderateReview(reviewId, dto, requester);
  }

  // ── Content Moderation Queue ─────────────────────

  @Get('moderation/flagged-content')
  @ApiOperation({ summary: 'List flagged content (products) awaiting moderation' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of flagged products with merchant and category details',
  })
  async listFlaggedContent(
    @Query() query: ListFlaggedContentDto,
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.listFlaggedContent(query, requester);
  }

  @Get('moderation/flagged-content/count')
  @ApiOperation({ summary: 'Get total count of flagged content' })
  @ApiResponse({
    status: 200,
    description: 'Number of flagged products awaiting moderation',
    schema: { example: { count: 8 } },
  })
  async getFlaggedContentCount(@CurrentUser() requester: User) {
    const count = await this.subAdminService.getFlaggedContentCount(requester);
    return { count };
  }

  @Patch('moderation/content/:id/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Take moderation action on flagged content (product)' })
  @ApiResponse({
    status: 200,
    description: 'Content moderation action completed',
  })
  async moderateContent(
    @Param('id') productId: string,
    @Body() dto: ContentModerationDto,
    @CurrentUser() requester: User,
  ): Promise<Product> {
    return this.subAdminService.moderateContent(productId, dto, requester);
  }

  // ── User Moderation ──────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'List users for moderation' })
  async listUsers(
    @Query() query: ListUsersDto,
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.listUsers(query, requester);
  }

  @Patch('users/:id/moderate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Warn, suspend, or restore a user account' })
  async moderateUser(
    @Param('id') userId: string,
    @Body() dto: UserModerationDto,
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.moderateUser(userId, dto, requester);
  }

  // ── Dispute Management ───────────────────────────

  @Get('disputes')
  @ApiOperation({ summary: 'List all order disputes' })
  async listDisputes(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: DisputeStatus,
    @CurrentUser() requester?: User,
  ) {
    return this.subAdminService.listDisputes(+page, +limit, status, requester);
  }

  @Get('disputes/:id')
  @ApiOperation({ summary: 'Get dispute details' })
  async getDispute(@Param('id') id: string, @CurrentUser() requester: User) {
    return this.subAdminService.getDispute(id, requester);
  }

  @Patch('disputes/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an order dispute' })
  async resolveDispute(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.resolveDispute(id, dto, requester);
  }

  @Post('disputes/:id/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an internal note to a dispute' })
  async addDisputeNote(
    @Param('id') id: string,
    @Body() dto: DisputeNoteDto,
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.addDisputeNote(id, dto, requester);
  }

  // ── Admin Activity Logs ──────────────────────────

  @Get('activity-logs')
  @ApiOperation({ summary: 'View admin action logs' })
  @Roles(UserRole.SUB_ADMIN, UserRole.ADMIN)
  async listActivityLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('adminId') adminId?: string,
    @CurrentUser() requester?: User,
  ) {
    // Sub-admins can only view their own activity logs
    const effectiveAdminId =
      requester?.role === UserRole.SUB_ADMIN ? requester.id : adminId;
    return this.subAdminService.listActivityLogs(+page, +limit, effectiveAdminId);
  }

  // ── Permissions ──────────────────────────────────

  @Get('permissions/:userId')
  @ApiOperation({ summary: 'Get permissions for a sub-admin' })
  async getPermissions(@Param('userId') userId: string, @CurrentUser() requester: User) {
    return this.subAdminService.getPermissions(userId, requester);
  }

  @Patch('permissions/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update permissions for a sub-admin (Admin only)' })
  @Roles(UserRole.ADMIN)
  async updatePermissions(
    @Param('userId') userId: string,
    @Body() dto: any, // Using any for partial update of entity
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.updatePermissions(userId, dto, requester);
  }

  // ── Reports & Export ─────────────────────────────

  @Get('reports')
  @ApiOperation({ summary: 'List generated moderation reports' })
  async listReports(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.listReports(requester, +page, +limit);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Generate a new moderation report' })
  async generateReport(
    @Body() dto: { title: string; description?: string },
    @CurrentUser() requester: User,
  ) {
    return this.subAdminService.generateReport(requester, dto);
  }

  @Get('activity-log/export')
  @ApiOperation({ summary: 'Export activity logs' })
  async exportActivityLog(@CurrentUser() requester: User) {
    return this.subAdminService.exportActivityLog(requester);
  }
}
