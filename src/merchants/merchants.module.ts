import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from '../database/entities/supporting.entities';
import { OrderItem } from '../database/entities/order.entity';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant, OrderItem]), PaymentsModule, NotificationsModule],
  providers: [MerchantsService],
  controllers: [MerchantsController],
  exports: [MerchantsService],
})
export class MerchantsModule {}
