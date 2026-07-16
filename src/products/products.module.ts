import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../database/entities/product.entity';
import { Merchant } from '../database/entities/supporting.entities';
import { Category } from '../database/entities/supporting.entities';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Merchant, Category]),
    NotificationsModule,
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule { }