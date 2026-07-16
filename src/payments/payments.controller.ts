import { Controller, Post, Body, Req, RawBodyRequest, UseGuards, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../database/entities/user.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('intent')
  createIntent(@Body() body: { amount: number; currency?: string; metadata?: Record<string, string> }) {
    return this.svc.createPaymentIntent(body.amount, body.currency, body.metadata || {});
  }

  @Public()
  @Post('webhook')
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') sig: string) {
    return this.svc.handleWebhook(req.rawBody!, sig);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Post('confirm')
  confirmPayment(
    @Body() body: { paymentIntentId: string; orderId?: string },
    @CurrentUser() user: User,
  ) {
    return this.svc.confirmOrderPayment(body.paymentIntentId, user, body.orderId);
  }
}
