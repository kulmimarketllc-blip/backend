import { BaseEntity } from './base.entity';
import { Order } from './order.entity';
import { Address, Wishlist } from './supporting.entities';
import { Review } from './review-coupon.entities';
export declare enum UserRole {
    CUSTOMER = "customer",
    MERCHANT = "merchant",
    DELIVERY_PARTNER = "delivery_partner",
    SUB_ADMIN = "sub_admin",
    ADMIN = "admin"
}
export declare enum AuthProvider {
    LOCAL = "local",
    GOOGLE = "google",
    FACEBOOK = "facebook"
}
export declare class User extends BaseEntity {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    passwordHash?: string;
    role: UserRole;
    provider: AuthProvider;
    providerId?: string;
    isVerified: boolean;
    isActive: boolean;
    avatarUrl?: string;
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
    refreshTokenHash?: string;
    lastLoginAt?: Date;
    fcmToken?: string;
    isSuspended: boolean;
    suspensionReason?: string;
    warningCount: number;
    moderationNotes?: string;
    orders: Order[];
    addresses: Address[];
    reviews: Review[];
    wishlist: Wishlist[];
    get fullName(): string;
}
