import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Order, OrderItem } from '../database/entities/order.entity';
import { Product } from '../database/entities/product.entity';
import { Merchant, Category } from '../database/entities/supporting.entities';
import { PlatformSetting } from '../database/entities/platform-setting.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Order, OrderItem, Product, Merchant, Category, PlatformSetting])],
  providers: [AdminService],
  controllers: [AdminController],
  exports: [AdminService],
})
export class AdminModule {}
