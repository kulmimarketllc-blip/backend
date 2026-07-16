import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum NotificationType {
  ORDER = 'order',
  DISPUTE = 'dispute',
  SYSTEM = 'system',
  PROMO = 'promo',
  REVIEW = 'review',
  SUPPORT = 'support',
}

@Entity('app_notifications')
@Index(['userId'])
@Index(['isRead'])
@Index(['createdAt'])
export class AppNotification extends BaseEntity {
  @Column({ name: 'user_id', length: 26 })
  userId!: string;

  @Column({ length: 150 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.SYSTEM })
  type!: NotificationType;

  @Column({ nullable: true, name: 'action_url' })
  actionUrl?: string;

  @Column({ default: false, name: 'is_read' })
  isRead!: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
