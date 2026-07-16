import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { DeliveryGateway } from './delivery.gateway';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { Order } from '../database/entities/order.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Order]), JwtModule],
  providers: [DeliveryGateway, DeliveryService],
  controllers: [DeliveryController],
  exports: [DeliveryGateway, DeliveryService],
})
export class DeliveryModule {}
