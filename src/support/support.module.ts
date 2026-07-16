import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportTicket, SupportTicketReply } from '../database/entities/support-ticket.entity';
import { User } from '../database/entities/user.entity';

import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket, SupportTicketReply, User]),
    NotificationsModule,
  ],
  controllers: [SupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
