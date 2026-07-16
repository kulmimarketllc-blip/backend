import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';
@ApiTags('delivery')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly svc: DeliveryService) {}
  @Get('active') getActive(@CurrentUser() user: User) { return this.svc.getActiveDelivery(user.id); }
  @Post('confirm-otp') confirmOtp(@Body() body: { orderId: string; otp: string }, @CurrentUser() user: User) {
    return this.svc.confirmDeliveryOtp(body.orderId, body.otp, user.id);
  }
}
