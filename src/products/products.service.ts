// products/products.service.ts
import {
  Injectable, NotFoundException, ForbiddenException,
  BadRequestException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import slugify from 'slugify';
import { ulid } from 'ulid';

import { Product, ProductStatus } from '../database/entities/product.entity';
import { NotificationType } from '../database/entities/notification.entity';
import { Merchant, MerchantStatus, Category } from '../database/entities/supporting.entities';
import { User, UserRole } from '../database/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly CACHE_TTL = 60000; // 60 seconds

  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly notifications: NotificationsService,
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) { }

  async findAll(query: ProductQueryDto) {
    const {
      page = 1, limit = 200, q, category, merchant,
      minPrice, maxPrice, inStock, sort = 'newest', featured,
    } = query;

    const where: any = {
      status: ProductStatus.ACTIVE,
    };

    if (category) where.categoryId = category;
    if (merchant) where.merchantId = merchant;
    if (featured) where.isFeatured = true;
    if (inStock) where.stock = MoreThanOrEqual(1);
    if (q) where.name = ILike(`%${q}%`);
    if (minPrice !== undefined && maxPrice !== undefined) {
      where.price = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      where.price = MoreThanOrEqual(minPrice);
    } else if (maxPrice !== undefined) {
      where.price = LessThanOrEqual(maxPrice);
    }

    const orderMap: Record<string, any> = {
      newest: { createdAt: 'DESC' },
      popular: { totalSold: 'DESC' },
      price_asc: { price: 'ASC' },
      price_desc: { price: 'DESC' },
      rating: { avgRating: 'DESC' },
    };

    const [data, total] = await this.productsRepo.findAndCount({
      where,
      order: orderMap[sort] ?? { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
      relations: ['merchant', 'category'],
    });

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const cacheKey = `product:${id}`;
    const cached = await this.cache.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.productsRepo.findOne({
      where: { id },
      relations: ['merchant', 'category', 'reviews'],
    });

    if (!product) throw new NotFoundException(`Product ${id} not found`);

    await this.cache.set(cacheKey, product, this.CACHE_TTL);
    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.productsRepo.findOne({
      where: { slug, status: ProductStatus.ACTIVE },
      relations: ['merchant', 'category'],
    });
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return product;
  }

  async findByMerchantUser(userId: string, query: ProductQueryDto) {
    const merchant = await this.merchantRepo.findOne({
      where: { userId },
      select: { id: true },
    });

    if (!merchant) {
      throw new NotFoundException('No merchant store found for this user');
    }

    const { page = 1, limit = 20, q, category, minPrice, maxPrice, inStock, sort = 'newest' } = query;
    const where: any = { merchantId: merchant.id };

    if (category) where.categoryId = category;
    if (inStock) where.stock = MoreThanOrEqual(1);
    if (q) where.name = ILike(`%${q}%`);
    if (minPrice !== undefined && maxPrice !== undefined) {
      where.price = Between(minPrice, maxPrice);
    } else if (minPrice !== undefined) {
      where.price = MoreThanOrEqual(minPrice);
    } else if (maxPrice !== undefined) {
      where.price = LessThanOrEqual(maxPrice);
    }

    const orderMap: Record<string, any> = {
      newest: { createdAt: 'DESC' },
      popular: { totalSold: 'DESC' },
      price_asc: { price: 'ASC' },
      price_desc: { price: 'DESC' },
      rating: { avgRating: 'DESC' },
    };

    const [data, total] = await this.productsRepo.findAndCount({
      where,
      order: orderMap[sort] ?? { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: Math.min(limit, 100),
      relations: ['merchant', 'category'],
    });

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Resolve category ID from either ULID or slug
   * @param identifier - Can be ULID or slug
   * @returns Category ULID
   */
  private async resolveCategoryId(identifier: string): Promise<string> {
    // Check if it's a valid ULID format (26 characters alphanumeric)
    const isUlidFormat = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(identifier);

    let category: Category | null = null;

    if (isUlidFormat) {
      // Try to find by ULID first
      category = await this.categoryRepo.findOne({
        where: { id: identifier },
      });
    }

    // If not found by ULID or not ULID format, try by slug
    if (!category) {
      category = await this.categoryRepo.findOne({
        where: { slug: identifier.toLowerCase() },
      });
    }

    // If still not found, try by name (case insensitive)
    if (!category) {
      category = await this.categoryRepo.findOne({
        where: { name: ILike(identifier) },
      });
    }

    if (!category) {
      // Get available categories for error message
      const availableCategories = await this.categoryRepo.find({
        select: ['id', 'name', 'slug'],
        take: 10,
      });

      const availableList = availableCategories
        .map(c => `"${c.slug}" (${c.name})`)
        .join(', ');

      throw new BadRequestException(
        `Category not found with identifier: "${identifier}". ` +
        `Available categories: ${availableList || 'No categories found'}`
      );
    }

    return category.id;
  }

  async create(dto: CreateProductDto, user: User) {
    const isPlatformAdmin = [UserRole.ADMIN, UserRole.SUB_ADMIN].includes(user.role);

    let resolvedMerchantId = dto.merchantId;
    if (!isPlatformAdmin) {
      const merchant = await this.merchantRepo.findOne({
        where: { userId: user.id },
        select: { id: true, status: true },
      });
      if (!merchant) {
        throw new ForbiddenException('No merchant store found for this user');
      }
      if (merchant.status !== MerchantStatus.APPROVED) {
        throw new ForbiddenException('Your merchant account must be approved before creating products');
      }
      resolvedMerchantId = merchant.id;
    }

    if (!resolvedMerchantId) {
      throw new BadRequestException('merchantId is required');
    }

    // Resolve category ID from slug or ULID
    const resolvedCategoryId = await this.resolveCategoryId(dto.categoryId);

    // Generate unique slug
    const slug = await this.generateSlug(dto.name);

    // Ensure images is always an array (even if undefined or null)
    const images = dto.images && Array.isArray(dto.images) ? dto.images : [];

    // Create product with resolved category ID
    const productData = {
      ...dto,
      id: ulid(),
      slug,
      merchantId: resolvedMerchantId,
      categoryId: resolvedCategoryId, // Use resolved category ULID
      images: images,
      status: isPlatformAdmin ? ProductStatus.ACTIVE : ProductStatus.PENDING_REVIEW,
    };

    const product = this.productsRepo.create(productData);

    try {
      const saved = await this.productsRepo.save(product);
      this.logger.log(`Product created: ${saved.id} by user ${user.id}`);
      return saved;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('A product with this name or SKU already exists');
      }
      if (error.code === '23503') {
        throw new BadRequestException('Invalid merchantId provided');
      }
      this.logger.error(`Error creating product: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto, user: User) {
    const product = await this.findOne(id);
    const isPlatformAdmin = [UserRole.ADMIN, UserRole.SUB_ADMIN].includes(user.role);

    // Check permissions
    if (!isPlatformAdmin) {
      const merchant = await this.merchantRepo.findOne({
        where: { userId: user.id },
        select: { id: true },
      });
      if (product.merchantId !== merchant?.id) {
        throw new ForbiddenException('You do not own this product');
      }

      // Prevent merchants from changing status
      if (dto.status !== undefined) {
        throw new ForbiddenException('Only admins can change product status');
      }
    }

    // Update slug if name changed
    if (dto.name && dto.name !== product.name) {
      dto.slug = await this.generateSlug(dto.name, id);
    }

    // Resolve category ID if categoryId is being updated
    if (dto.categoryId && dto.categoryId !== product.categoryId) {
      dto.categoryId = await this.resolveCategoryId(dto.categoryId);
    }

    // Handle images update
    if (dto.images !== undefined) {
      dto.images = Array.isArray(dto.images) ? dto.images : [];
    }

    Object.assign(product, dto);
    const updated = await this.productsRepo.save(product);

    // Invalidate cache
    await this.cache.del(`product:${id}`);

    return updated;
  }


  async remove(id: string, user: User) {
    const product = await this.findOne(id);
    const isPlatformAdmin = [UserRole.ADMIN, UserRole.SUB_ADMIN].includes(user.role);

    if (!isPlatformAdmin) {
      const merchant = await this.merchantRepo.findOne({
        where: { userId: user.id },
        select: { id: true },
      });
      if (product.merchantId !== merchant?.id) {
        throw new ForbiddenException('You do not own this product');
      }
    }

    await this.productsRepo.softDelete(id);
    await this.cache.del(`product:${id}`);

    return { message: 'Product deleted successfully' };
  }

  async restock(id: string, quantity: number, user: User) {
    const product = await this.findOne(id);
    const isPlatformAdmin = [UserRole.ADMIN, UserRole.SUB_ADMIN].includes(user.role);

    if (!isPlatformAdmin) {
      const merchant = await this.merchantRepo.findOne({
        where: { userId: user.id },
        select: { id: true },
      });
      if (product.merchantId !== merchant?.id) {
        throw new ForbiddenException('You do not own this product');
      }
    }

    product.stock += quantity;
    if (product.stock > 0 && product.status === ProductStatus.OUT_OF_STOCK) {
      product.status = ProductStatus.ACTIVE;
    }

    const updated = await this.productsRepo.save(product);
    await this.cache.del(`product:${id}`);

    return { id, newStock: updated.stock };
  }

  async getFeaturedProducts(limit: number = 12) {
    const cacheKey = 'products:featured';
    const cached = await this.cache.get<Product[]>(cacheKey);
    if (cached) return cached;

    const products = await this.productsRepo.find({
      where: {
        status: ProductStatus.ACTIVE,
        isFeatured: true,
      },
      order: { createdAt: 'DESC' },
      take: limit,
      relations: ['merchant', 'category'],
    });

    await this.cache.set(cacheKey, products, this.CACHE_TTL);
    return products;
  }

  async getTrendingProducts(limit: number = 12) {
    const cacheKey = 'products:trending';
    const cached = await this.cache.get<Product[]>(cacheKey);
    if (cached) return cached;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const products = await this.productsRepo.find({
      where: {
        status: ProductStatus.ACTIVE,
        updatedAt: MoreThanOrEqual(sevenDaysAgo),
      },
      order: { totalSold: 'DESC' },
      take: limit,
      relations: ['merchant', 'category'],
    });

    await this.cache.set(cacheKey, products, 300000); // 5 minutes cache
    return products;
  }

  async getCategoryCounts(): Promise<Record<string, number>> {
    const cacheKey = 'products:category-counts';
    const cached = await this.cache.get<Record<string, number>>(cacheKey);
    if (cached) return cached;

    const categories = await this.categoryRepo.find({
      relations: ['products'],
    });

    const counts: Record<string, number> = {};
    for (const category of categories) {
      counts[category.slug] = category.products?.filter(
        p => p.status === ProductStatus.ACTIVE
      ).length || 0;
    }

    await this.cache.set(cacheKey, counts, this.CACHE_TTL);
    return counts;
  }

  async flag(id: string) {
    const product = await this.findOne(id);
    product.flagCount += 1;
    await this.productsRepo.save(product);
    await this.cache.del(`product:${id}`);

    // Notify admins
    await this.notifications.notifySubAdmins(
      'Product Flagged',
      `Product "${product.name}" has been flagged for review`,
      NotificationType.SYSTEM,
      `/admin/products/${id}`
    );

    return { success: true, flagCount: product.flagCount };
  }

  private async generateSlug(name: string, excludeId?: string): Promise<string> {
    let base = slugify(name, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    let slug = base;
    let counter = 1;

    while (true) {
      const existing = await this.productsRepo.findOne({
        where: { slug },
        withDeleted: true,
      });

      if (!existing || existing.id === excludeId) {
        return slug;
      }

      slug = `${base}-${counter++}`;
    }
  }
}