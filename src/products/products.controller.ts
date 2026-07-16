// products/products.controller.ts
import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
  UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { fileUrl, multerOptions } from '../uploads/multer.config';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly config: ConfigService,
  ) { }
  @Public()
  @Get()
  @ApiOperation({ summary: 'List products with filters & pagination' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'Get featured products' })
  getFeaturedProducts(@Query('limit') limit = 12) {
    return this.productsService.getFeaturedProducts(+limit);
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Get trending products (most sold in last 7 days)' })
  getTrendingProducts(@Query('limit') limit = 12) {
    return this.productsService.getTrendingProducts(+limit);
  }

  @Public()
  @Get('category-counts')
  @ApiOperation({ summary: 'Get active product counts per category slug' })
  getCategoryCounts() {
    return this.productsService.getCategoryCounts();
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get product by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Get('merchant/me')
  @ApiOperation({ summary: 'Get current merchant products' })
  findMyProducts(@CurrentUser() user: User, @Query() query: ProductQueryDto) {
    return this.productsService.findByMerchantUser(user.id, query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // ── Write endpoints (merchant/admin) ───────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUB_ADMIN)
  // products.controller.ts
  @Post()
  @ApiOperation({ summary: 'Create new product with optional image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'number' },
        categoryId: { type: 'string' },
        merchantId: { type: 'string' },
        comparePrice: { type: 'number' },
        sku: { type: 'string' },
        lowStockAt: { type: 'number' },
        isFeatured: { type: 'boolean' },
        variants: { type: 'string', description: 'JSON string of variants array' },
        images: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('images', 10, multerOptions('products')))
  async create(
    @Body() body: any,
    @CurrentUser() user: User,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const baseUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');

    // Parse variants if provided as JSON string
    let variants = undefined;
    if (body.variants) {
      try {
        variants = JSON.parse(body.variants);
      } catch (e) {
        throw new BadRequestException('Invalid variants JSON format');
      }
    }

    // Create DTO from body
    const dto: CreateProductDto = {
      name: body.name,
      description: body.description,
      price: parseFloat(body.price),
      stock: parseInt(body.stock),
      categoryId: body.categoryId,
      merchantId: body.merchantId,
      comparePrice: body.comparePrice ? parseFloat(body.comparePrice) : undefined,
      sku: body.sku,
      lowStockAt: body.lowStockAt ? parseInt(body.lowStockAt) : 10,
      isFeatured: body.isFeatured === 'true' || body.isFeatured === true,
      variants: variants,
      images: body.images ? (Array.isArray(body.images) ? body.images : [body.images]) : [],
    };

    // Initialize images array
    let allImages: string[] = [];

    // Add existing image URLs from DTO (if any)
    if (dto.images && Array.isArray(dto.images)) {
      allImages.push(...dto.images);
    }

    // Add uploaded files (if any)
    if (files && files.length > 0) {
      const uploadedUrls = files.map((f) =>
        fileUrl(baseUrl, 'products', f.filename),
      );
      allImages.push(...uploadedUrls);
    }

    // Set images (will be empty array if no images provided)
    dto.images = allImages;

    return this.productsService.create(dto, user);
  }

  // products.controller.ts - Update method
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUB_ADMIN)
  @Put(':id')
  @ApiOperation({ summary: 'Update product (optionally replace/add images)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, multerOptions('products')))
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @CurrentUser() user: User,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const baseUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');

    // Parse variants if provided as JSON string
    let variants = undefined;
    if (body.variants) {
      try {
        variants = JSON.parse(body.variants);
      } catch (e) {
        throw new BadRequestException('Invalid variants JSON format');
      }
    }

    // Create DTO from body
    const dto: UpdateProductDto = {};

    // Map all fields
    if (body.name) dto.name = body.name;
    if (body.description) dto.description = body.description;
    if (body.price) dto.price = parseFloat(body.price);
    if (body.stock) dto.stock = parseInt(body.stock);
    if (body.categoryId) dto.categoryId = body.categoryId;
    if (body.merchantId) dto.merchantId = body.merchantId;
    if (body.comparePrice) dto.comparePrice = parseFloat(body.comparePrice);
    if (body.sku) dto.sku = body.sku;
    if (body.lowStockAt) dto.lowStockAt = parseInt(body.lowStockAt);
    if (body.isFeatured !== undefined) dto.isFeatured = body.isFeatured === 'true' || body.isFeatured === true;
    if (body.status) dto.status = body.status;
    if (variants) dto.variants = variants;

    // Only process images if files are uploaded
    if (files && files.length > 0) {
      const uploadedUrls = files.map((f) =>
        fileUrl(baseUrl, 'products', f.filename),
      );
      const existingUrls = body.images ? (Array.isArray(body.images) ? body.images : [body.images]) : [];
      dto.images = [...existingUrls, ...uploadedUrls];
    }

    return this.productsService.update(id, dto, user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUB_ADMIN)
  @Put(':id/restock')
  @ApiOperation({ summary: 'Update product stock level' })
  restock(
    @Param('id') id: string,
    @Body() body: { quantity: number },
    @CurrentUser() user: User,
  ) {
    return this.productsService.restock(id, body.quantity, user);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.MERCHANT, UserRole.ADMIN, UserRole.SUB_ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.productsService.remove(id, user);
  }

  @Post(':id/flag')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Flag product for moderation' })
  flag(@Param('id') id: string) {
    return this.productsService.flag(id);
  }
}