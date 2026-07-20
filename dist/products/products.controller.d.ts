import { ConfigService } from '@nestjs/config';
import { ProductsService } from './products.service';
import { ProductQueryDto } from './dto/product-query.dto';
import { User } from '../database/entities/user.entity';
export declare class ProductsController {
    private readonly productsService;
    private readonly config;
    constructor(productsService: ProductsService, config: ConfigService);
    findAll(query: ProductQueryDto): Promise<{
        data: import("../database/entities/product.entity").Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    getFeaturedProducts(limit?: number): Promise<import("../database/entities/product.entity").Product[]>;
    getTrendingProducts(limit?: number): Promise<import("../database/entities/product.entity").Product[]>;
    getCategoryCounts(): Promise<Record<string, number>>;
    findBySlug(slug: string): Promise<import("../database/entities/product.entity").Product>;
    findMyProducts(user: User, query: ProductQueryDto): Promise<{
        data: import("../database/entities/product.entity").Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<import("../database/entities/product.entity").Product>;
    create(body: any, user: User, files?: Express.Multer.File[]): Promise<import("../database/entities/product.entity").Product>;
    update(id: string, body: any, user: User, files?: Express.Multer.File[]): Promise<import("../database/entities/product.entity").Product>;
    restock(id: string, body: {
        quantity: number;
    }, user: User): Promise<{
        id: string;
        newStock: number;
    }>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
    flag(id: string): Promise<{
        success: boolean;
        flagCount: number;
    }>;
}
