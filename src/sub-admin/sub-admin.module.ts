import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubAdminService } from './sub-admin.service';
import { SubAdminController } from './sub-admin.controller';
import { Merchant } from '../database/entities/supporting.entities';
import { User } from '../database/entities/user.entity';
import { Review } from '../database/entities/review-coupon.entities';
import { Product } from '../database/entities/product.entity';
import { Dispute, AdminActivityLog, SubAdminPermission, SubAdminReport } from '../database/entities/sub-admin-features.entity';
import { MerchantsModule } from '../merchants/merchants.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Merchant, User, Review, Product, Dispute, AdminActivityLog, SubAdminPermission, SubAdminReport
    ]),
    MerchantsModule,
    OrdersModule,
    NotificationsModule,
  ],
  controllers: [SubAdminController],
  providers: [SubAdminService],
  exports: [SubAdminService],
})
export class SubAdminModule {}
