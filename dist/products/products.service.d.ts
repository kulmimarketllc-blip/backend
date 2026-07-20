import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { Product } from '../database/entities/product.entity';
import { Merchant, Category } from '../database/entities/supporting.entities';
import { User } from '../database/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
export declare class ProductsService {
    private readonly productsRepo;
    private readonly merchantRepo;
    private readonly categoryRepo;
    private readonly notifications;
    private readonly cache;
    private readonly logger;
    private readonly CACHE_TTL;
    constructor(productsRepo: Repository<Product>, merchantRepo: Repository<Merchant>, categoryRepo: Repository<Category>, notifications: NotificationsService, cache: Cache);
    findAll(query: ProductQueryDto): Promise<{
        data: Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<Product>;
    findBySlug(slug: string): Promise<Product>;
    findByMerchantUser(userId: string, query: ProductQueryDto): Promise<{
        data: Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    private resolveCategoryId;
    create(dto: CreateProductDto, user: User): Promise<Product>;
    update(id: string, dto: UpdateProductDto, user: User): Promise<Product>;
    remove(id: string, user: User): Promise<{
        message: string;
    }>;
    restock(id: string, quantity: number, user: User): Promise<{
        id: string;
        newStock: number;
    }>;
    getFeaturedProducts(limit?: number): Promise<Product[]>;
    getTrendingProducts(limit?: number): Promise<Product[]>;
    getCategoryCounts(): Promise<Record<string, number>>;
    flag(id: string): Promise<{
        success: boolean;
        flagCount: number;
    }>;
    private generateSlug;
}
