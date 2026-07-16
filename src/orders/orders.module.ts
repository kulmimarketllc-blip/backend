import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Order, OrderItem } from '../database/entities/order.entity';
import { Product } from '../database/entities/product.entity';
import { User } from '../database/entities/user.entity';
import { Dispute } from '../database/entities/sub-admin-features.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersProcessor } from './orders.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, User, Dispute]),
    BullModule.registerQueue({ name: 'orders' }),
    NotificationsModule,
    MerchantsModule,
    PaymentsModule,
  ],
  providers: [OrdersService, OrdersProcessor],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
