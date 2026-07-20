import { ShippingMethod } from '../../database/entities/order.entity';
export declare class OrderItemDto {
    productId: string;
    quantity: number;
    variantId?: string;
}
export declare class CreateOrderDto {
    items: OrderItemDto[];
    addressId: string;
    paymentIntentId: string;
    shippingMethod?: ShippingMethod;
    couponCode?: string;
}
