import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { NotificationType } from '../database/entities/notification.entity';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MerchantsService } from '../merchants/merchants.service';

interface OrderConfirmedJob {
  orderId: string;
  customerId: string;
  otp: string;
  total: number;
}

interface StatusChangedJob {
  orderId: string;
  newStatus: string;
  customerId: string;
}

@Processor('orders')
export class OrdersProcessor {
  private readonly logger = new Logger(OrdersProcessor.name);

  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(User)  private readonly usersRepo: Repository<User>,
    private readonly notifications: NotificationsService,
    private readonly merchantsService: MerchantsService,
  ) {}

  @Process('order-confirmed')
  async handleOrderConfirmed(job: Job<OrderConfirmedJob>) {
    const { orderId, customerId, otp, total } = job.data;
    this.logger.log(`Processing order-confirmed job: ${orderId}`);

    const user = await this.usersRepo.findOneBy({ id: customerId });
    if (!user) return;

    // In-App Notification for Customer
    await this.notifications.createNotification(
      customerId,
      'Order Confirmed ✅',
      `Your order ${orderId} has been confirmed. Total: $${total}.`,
      NotificationType.ORDER,
      '/dashboard/orders'
    );

    // Notify Merchant(s)
    const order = await this.ordersRepo.findOne({
      where: { id: orderId },
      relations: ['items'],
    });

    if (order?.items) {
      const merchantIds = [...new Set(order.items.map(item => item.merchantId).filter(Boolean))];
      for (const mId of merchantIds) {
        const merchant = await this.merchantsService.findById(mId as string);
        if (!merchant?.userId) continue;

        await this.notifications.createNotification(
          merchant.userId,
          '📦 New Order Received',
          `You have a new order to prepare: ${orderId}`,
          NotificationType.ORDER,
          '/merchant/orders'
        );
      }
    }

    if (user.email) {
      await this.notifications.sendOrderConfirmation(user.email, orderId, total, otp);
    }
  }

  @Process('status-changed')
  async handleStatusChanged(job: Job<StatusChangedJob>) {
    const { orderId, newStatus, customerId } = job.data;
    this.logger.log(`Status changed: ${orderId} → ${newStatus}`);

    const user = await this.usersRepo.findOneBy({ id: customerId });
    if (!user) return;

    // In-App Notification for Customer
    await this.notifications.createNotification(
      customerId,
      `Order ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
      `Your order ${orderId} is now ${newStatus.replace(/_/g, ' ')}.`,
      NotificationType.ORDER,
      '/dashboard/orders'
    );

    if (user.email) {
      await this.notifications.sendOrderStatusUpdate(user.email, orderId, newStatus);
    }
  }


  @OnQueueFailed()
  handleFailed(job: Job, err: Error) {
    this.logger.error(`Job failed: ${job.name} #${job.id} — ${err.message}`);
  }
}
