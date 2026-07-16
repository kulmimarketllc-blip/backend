import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Order } from '../database/entities/order.entity';
import { Product } from '../database/entities/product.entity';

@Module({
	imports: [TypeOrmModule.forFeature([Order, Product])],
	providers: [PaymentsService],
	controllers: [PaymentsController],
	exports: [PaymentsService],
})
export class PaymentsModule {}
