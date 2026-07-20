declare class VariantValueDto {
    id: string;
    value: string;
    priceModifier?: number;
    stock?: number;
    sku?: string;
}
declare class ProductVariantDto {
    type: 'color' | 'size' | 'material' | 'custom';
    label: string;
    values: VariantValueDto[];
}
export declare class CreateProductDto {
    name: string;
    description: string;
    price: number;
    comparePrice?: number;
    stock: number;
    sku?: string;
    categoryId: string;
    merchantId?: string;
    lowStockAt?: number;
    variants?: ProductVariantDto[];
    images?: string[];
    isFeatured?: boolean;
}
export {};
