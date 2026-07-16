import {
  Entity, Column, OneToMany, OneToOne, Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { Address, Wishlist } from './supporting.entities';
import { Review } from './review-coupon.entities';

export enum UserRole {
  CUSTOMER = 'customer',
  MERCHANT = 'merchant',
  DELIVERY_PARTNER = 'delivery_partner',
  SUB_ADMIN = 'sub_admin',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}


@Entity('users')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true, where: '"phone" IS NOT NULL' })
@Index(['firstName'])
@Index(['lastName'])
export class User extends BaseEntity {
  @Column({ length: 80 })
  firstName!: string;

  @Column({ length: 80 })
  lastName!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ nullable: true, length: 20 })
  phone?: string;

  @Column({ nullable: true })
  @Exclude()           // never sent in responses
  passwordHash?: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
  role!: UserRole;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  provider!: AuthProvider;

  @Column({ nullable: true })
  providerId?: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true, length: 500 })
  avatarUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  customerSettings?: {
    notifications?: {
      'order-updates'?: boolean;
      offers?: boolean;
      arrivals?: boolean;
      'price-drops'?: boolean;
    };
    security?: {
      'two-factor'?: boolean;
      'login-alerts'?: boolean;
    };
  };

  @Column({ nullable: true })
  @Exclude()
  refreshTokenHash?: string;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  fcmToken?: string;

  @Column({ default: false, name: 'is_suspended' })
  isSuspended!: boolean;

  @Column({ nullable: true, name: 'suspension_reason' })
  suspensionReason?: string;

  @Column({ default: 0, name: 'warning_count' })
  warningCount!: number;

  @Column({ type: 'text', nullable: true, name: 'moderation_notes' })
  moderationNotes?: string;

  // ── Relations ──
  @OneToMany(() => Order, (order) => order.customer)
  orders!: Order[];

  @OneToMany(() => Address, (address) => address.user)
  addresses!: Address[];

  @OneToMany(() => Review, (review) => review.user)
  reviews!: Review[];

  @OneToMany(() => Wishlist, (wish) => wish.user)
  wishlist!: Wishlist[];

  // ── Computed ──
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
