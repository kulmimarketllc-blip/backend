import {
  Entity,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Order } from './order.entity';
import { Merchant } from './supporting.entities';

// ─── DISPUTE ─────────────────────────────────────

export enum DisputeReason {
  ITEM_NOT_RECEIVED = 'item_not_received',
  ITEM_NOT_AS_DESCRIBED = 'item_not_as_described',
  DEFECTIVE = 'defective',
  FRAUDULENT_ACTIVITY = 'fraudulent_activity',
  MERCHANT_CANCELLATION = 'merchant_cancellation',
  OTHER = 'other',
}

export enum DisputeStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  MERCHANT_RESPONSE_REQUIRED = 'merchant_response_required',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('disputes')
@Index(['status'])
@Index(['orderId'])
@Index(['customerId'])
@Index(['merchantId'])
export class Dispute extends BaseEntity {
  @Column({ name: 'order_id', length: 20 })
  orderId!: string;

  @Column({ name: 'customer_id', length: 26 })
  customerId!: string;

  @Column({ name: 'merchant_id', length: 26 })
  merchantId!: string;

  @Column({ type: 'enum', enum: DisputeReason, default: DisputeReason.OTHER })
  reason!: DisputeReason;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  evidence?: string[]; // URLs to evidence images/docs

  @Column({ type: 'enum', enum: DisputeStatus, default: DisputeStatus.PENDING })
  status!: DisputeStatus;

  @Column({ type: 'text', nullable: true })
  resolution?: string;

  @Column({ type: 'jsonb', default: [] })
  notes!: DisputeNote[];

  // ── Relations ──
  @ManyToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer!: User;

  @ManyToOne(() => Merchant)
  @JoinColumn({ name: 'merchant_id' })
  merchant!: Merchant;
}

export interface DisputeNote {
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  isResolution?: boolean;
}

// ─── ADMIN ACTIVITY LOG ──────────────────────────

@Entity('admin_activity_logs')
@Index(['adminId'])
@Index(['targetType', 'targetId'])
@Index(['createdAt'])
export class AdminActivityLog extends BaseEntity {
  @Column({ name: 'admin_id', length: 26 })
  adminId!: string;

  @Column()
  action!: string; // e.g., 'SUSPEND_USER', 'RESOLVE_DISPUTE'

  @Column({ name: 'target_type' })
  targetType!: string; // e.g., 'User', 'Dispute', 'Merchant'

  @Column({ name: 'target_id' })
  targetId!: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin!: User;
}

// ─── SUB-ADMIN PERMISSION ────────────────────────

@Entity('sub_admin_permissions')
export class SubAdminPermission extends BaseEntity {
  @Column({ name: 'user_id', length: 26, unique: true })
  userId!: string;

  @Column({ default: false, name: 'can_manage_users' })
  canManageUsers!: boolean;

  @Column({ default: false, name: 'can_manage_disputes' })
  canManageDisputes!: boolean;

  @Column({ default: true, name: 'can_approve_merchants' })
  canApproveMerchants!: boolean;

  @Column({ default: true, name: 'can_moderate_reviews' })
  canModerateReviews!: boolean;

  @Column({ default: true, name: 'can_view_dashboard' })
  canViewDashboard!: boolean;

  @Column({ default: false, name: 'can_edit_permissions' })
  canEditPermissions!: boolean;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

// ─── SUB-ADMIN REPORT ────────────────────────────

export enum ReportStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  ARCHIVED = 'archived',
}

@Entity('sub_admin_reports')
@Index(['adminId'])
export class SubAdminReport extends BaseEntity {
  @Column({ name: 'admin_id', length: 26 })
  adminId!: string;

  @Column({ length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.DRAFT })
  status!: ReportStatus;

  @Column({ type: 'jsonb', nullable: true })
  data?: any; // The actual report content/stats

  @Column({ nullable: true, name: 'file_url' })
  fileUrl?: string; // URL to PDF/CSV version

  @ManyToOne(() => User)
  @JoinColumn({ name: 'admin_id' })
  admin!: User;
}
