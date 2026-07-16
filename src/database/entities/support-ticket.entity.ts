import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

export enum SupportTicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum SupportTicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum SupportTicketCategory {
  ORDER = 'order',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  ACCOUNT = 'account',
  MERCHANT = 'merchant',
  OTHER = 'other',
}

@Entity('support_tickets')
@Index(['status'])
@Index(['priority'])
@Index(['customerId'])
@Index(['assignedToId'])
@Index(['createdAt'])
export class SupportTicket extends BaseEntity {
  @Column({ name: 'ticket_no', length: 24, unique: true })
  ticketNo!: string;

  @Column({ name: 'customer_id', length: 26 })
  customerId!: string;

  @Column({ name: 'assigned_to_id', length: 26, nullable: true })
  assignedToId?: string;

  @Column({ name: 'order_id', length: 20, nullable: true })
  orderId?: string;

  @Column({ type: 'varchar', length: 180 })
  subject!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({
    type: 'enum',
    enum: SupportTicketCategory,
    default: SupportTicketCategory.OTHER,
  })
  category!: SupportTicketCategory;

  @Column({
    type: 'enum',
    enum: SupportTicketPriority,
    default: SupportTicketPriority.MEDIUM,
  })
  priority!: SupportTicketPriority;

  @Column({
    type: 'enum',
    enum: SupportTicketStatus,
    default: SupportTicketStatus.OPEN,
  })
  status!: SupportTicketStatus;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt?: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Column({ name: 'last_reply_at', type: 'timestamptz', nullable: true })
  lastReplyAt?: Date;

  @Column({ name: 'last_reply_by_id', length: 26, nullable: true })
  lastReplyById?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer!: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: User;

  @OneToMany(() => SupportTicketReply, (reply) => reply.ticket)
  replies!: SupportTicketReply[];
}

@Entity('support_ticket_replies')
@Index(['ticketId'])
@Index(['authorId'])
@Index(['createdAt'])
export class SupportTicketReply extends BaseEntity {
  @Column({ name: 'ticket_id', length: 26 })
  ticketId!: string;

  @Column({ name: 'author_id', length: 26 })
  authorId!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ name: 'is_internal', default: false })
  isInternal!: boolean;

  @ManyToOne(() => SupportTicket, (ticket) => ticket.replies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket!: SupportTicket;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'author_id' })
  author!: User;
}
