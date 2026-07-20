import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Product } from './product.entity';
export declare enum MerchantStatus {
    PENDING = "pending",
    APPROVED = "approved",
    SUSPENDED = "suspended",
    REJECTED = "rejected"
}
export declare class Merchant extends BaseEntity {
    userId: string;
    storeName: string;
    storeSlug: string;
    description?: string;
    logoUrl?: string;
    bannerUrl?: string;
    status: MerchantStatus;
    isVerified: boolean;
    isOnline: boolean;
    commissionRate: number;
    totalRevenue: number;
    availableBalance: number;
    stripeAccountId?: string;
    avgRating: number;
    returnPolicyDays: number;
    businessInfo?: {
        email?: string;
        phone?: string;
        address?: string;
        taxId?: string;
        bankName?: string;
        accountLast4?: string;
        bankConnectedAt?: string;
        rejectionReason?: string;
        rejectedAt?: string;
        rejectedBy?: string;
    };
    user: User;
    products: Product[];
}
export declare enum AddressType {
    HOME = "home",
    WORK = "work",
    OTHER = "other"
}
export declare class Address extends BaseEntity {
    userId: string;
    type: AddressType;
    fullName: string;
    email?: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    isDefault: boolean;
    lat?: number;
    lng?: number;
    user: User;
}
export declare class Category extends BaseEntity {
    name: string;
    slug: string;
    iconUrl?: string;
    parentId?: string;
    isActive: boolean;
    sortOrder: number;
    products: Product[];
}
export declare class Review extends BaseEntity {
    productId: string;
    userId: string;
    orderId: string;
    rating: number;
    comment?: string;
    images?: string[];
    isVerifiedPurchase: boolean;
    merchantReply?: string;
    merchantRepliedAt?: Date;
    product: Product;
    user: User;
}
export declare class Wishlist extends BaseEntity {
    userId: string;
    productId: string;
    user: User;
    product: Product;
}
