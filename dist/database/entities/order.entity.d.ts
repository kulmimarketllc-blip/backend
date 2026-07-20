import { User } from './user.entity';
import { Address } from './supporting.entities';
import { Product } from './product.entity';
export declare enum OrderStatus {
    PENDING_PAYMENT = "pending_payment",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    READY_PICKUP = "ready_for_pickup",
    PICKED_UP = "picked_up",
    IN_TRANSIT = "in_transit",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    RETURN_REQUESTED = "return_requested",
    RETURNED = "returned",
    REFUNDED = "refunded",
    DISPUTED = "disputed"
}
export declare enum ShippingMethod {
    FREE = "free",
    EXPRESS = "express",
    NEXT_DAY = "next_day"
}
export declare class Order {
    id: string;
    customerId: string;
    driverId?: string;
    addressId: string;
    status: OrderStatus;
    shippingMethod: ShippingMethod;
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    couponCode?: string;
    stripePaymentIntentId?: string;
    deliveryOtp?: string;
    statusHistory: StatusHistoryEntry[];
    estimatedDelivery?: Date;
    deliveredAt?: Date;
    cancelledAt?: Date;
    cancelReason?: string;
    createdAt: Date;
    updatedAt: Date;
    customer: User;
    driver?: User;
    address: Address;
    items: OrderItem[];
    setTimestamps(): void;
}
export interface StatusHistoryEntry {
    status: OrderStatus;
    changedAt: string;
    changedBy?: string;
    note?: string;
}
export declare class OrderItem {
    id: string;
    orderId: string;
    productId: string;
    merchantId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variantId?: string;
    variantSnapshot?: Record<string, string>;
    productName: string;
    productImage?: string;
    commission: number;
    merchantEarnings: number;
    order: Order;
    product: Product;
}
