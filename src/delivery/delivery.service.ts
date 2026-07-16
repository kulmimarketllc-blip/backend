import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../database/entities/order.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DeliveryService {
  constructor(@InjectRepository(Order) private readonly ordersRepo: Repository<Order>) {}

  async getActiveDelivery(driverId: string) {
    const order = await this.ordersRepo.findOne({
      where: { driverId, status: OrderStatus.IN_TRANSIT },
      relations: ['items', 'address', 'customer'],
    });
    if (!order) return null;
    return order;
  }

  async confirmDeliveryOtp(orderId: string, otp: string, driverId: string) {
    const order = await this.ordersRepo.findOneBy({ id: orderId });
    if (!order) throw new NotFoundException('Order not found');
    if (order.driverId !== driverId) throw new BadRequestException('Forbidden');
    if (!order.deliveryOtp) throw new BadRequestException('Delivery OTP not set for this order');
    const valid = await bcrypt.compare(otp, order.deliveryOtp);
    if (!valid) throw new BadRequestException('Invalid OTP');
    await this.ordersRepo.update(orderId, { status: OrderStatus.DELIVERED, deliveredAt: new Date() });
    return { success: true, orderId };
  }
}
