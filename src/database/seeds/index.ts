import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ulid } from 'ulid';
import * as bcrypt from 'bcrypt';

const bcryptRounds = 12;

const userSeeds = [
  {
    role: 'customer',
    firstName: 'Aisha',
    lastName: 'Khan',
    email: 'customer@esuuq.local',
    phone: '+15550000001',
    password: 'Customer123!',
  },
  {
    role: 'merchant',
    firstName: 'Musa',
    lastName: 'Ahmed',
    email: 'merchant@esuuq.local',
    phone: '+15550000002',
    password: 'Merchant123!',
  },
  {
    role: 'delivery_partner',
    firstName: 'Omar',
    lastName: 'Ali',
    email: 'delivery@esuuq.local',
    phone: '+15550000003',
    password: 'Delivery123!',
  },
  {
    role: 'sub_admin',
    firstName: 'Sara',
    lastName: 'Hassan',
    email: 'subadmin@esuuq.local',
    phone: '+15550000004',
    password: 'SubAdmin123!',
  },
  {
    role: 'admin',
    firstName: 'System',
    lastName: 'Admin',
    email: 'admin@esuuq.local',
    phone: '+15550000005',
    password: 'Admin123!',
  },
] as const;

async function run() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? 'esuuq_user',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'esuuq_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    entities: [],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();

  try {
    await dataSource.query(`
      DO $$
      DECLARE
        table_name text;
      BEGIN
        FOR table_name IN
          SELECT tablename
          FROM pg_tables
          WHERE schemaname = 'public'
            AND tablename NOT IN ('migrations', 'typeorm_metadata')
        LOOP
          EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', table_name);
        END LOOP;
      END $$;
    `);

    const categories = [
      { name: 'Electronics', slug: 'electronics', sortOrder: 1 },
      { name: 'Fashion', slug: 'fashion', sortOrder: 2 },
      { name: 'Home & Garden', slug: 'home-garden', sortOrder: 3 },
      { name: 'Beauty', slug: 'beauty', sortOrder: 4 },
      { name: 'Sports', slug: 'sports', sortOrder: 5 },
      { name: 'Books', slug: 'books', sortOrder: 6 },
      { name: 'Toys & Kids', slug: 'toys-kids', sortOrder: 7 },
      { name: 'Tools & DIY', slug: 'tools-diy', sortOrder: 8 },
      { name: 'Food & Grocery', slug: 'food-grocery', sortOrder: 9 },
      { name: 'Health', slug: 'health', sortOrder: 10 },
      { name: 'Pet Supplies', slug: 'pet-supplies', sortOrder: 11 },
      { name: 'Toys', slug: 'toys', sortOrder: 12 },
      { name: 'Automotive', slug: 'automotive', sortOrder: 13 },
      { name: 'Office', slug: 'office', sortOrder: 14 },
    ];

    for (const category of categories) {
      await dataSource.query(
        `
          INSERT INTO categories (id, name, slug, sort_order, is_active)
          VALUES ($1, $2, $3, $4, true)
          ON CONFLICT (slug)
          DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order
        `,
        [ulid(), category.name, category.slug, category.sortOrder],
      );
    }

    const seededUsers: Array<Record<string, unknown> & { role: string; password: string }> = [];

    for (const user of userSeeds) {
      const passwordHash = await bcrypt.hash(user.password, bcryptRounds);
      const result = await dataSource.query(
        `
          INSERT INTO users (
            id, first_name, last_name, email, phone, password_hash,
            role, provider, is_verified, is_active,
            is_suspended, warning_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, 'local', true, true, false, 0)
          ON CONFLICT (email)
          DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role,
            provider = EXCLUDED.provider,
            is_verified = EXCLUDED.is_verified,
            is_active = EXCLUDED.is_active,
            is_suspended = EXCLUDED.is_suspended,
            warning_count = EXCLUDED.warning_count,
            updated_at = NOW()
          RETURNING id, email, role
        `,
        [
          ulid(),
          user.firstName,
          user.lastName,
          user.email,
          user.phone,
          passwordHash,
          user.role,
        ],
      );

      seededUsers.push({
        role: user.role,
        email: user.email,
        password: user.password,
        id: result[0]?.id,
      });
    }

    const merchantUser = seededUsers.find((user) => user.role === 'merchant');
    if (merchantUser?.id) {
      await dataSource.query(
        `
          INSERT INTO merchants (
            id, user_id, store_name, store_slug, description, status,
            is_verified, is_online, commission_rate, total_revenue,
            available_balance, avg_rating, return_policy_days, business_info
          )
          VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, 0, 0, 0, 14, $8::jsonb)
          ON CONFLICT (user_id)
          DO UPDATE SET
            store_name = EXCLUDED.store_name,
            store_slug = EXCLUDED.store_slug,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            is_verified = EXCLUDED.is_verified,
            is_online = EXCLUDED.is_online,
            commission_rate = EXCLUDED.commission_rate,
            return_policy_days = EXCLUDED.return_policy_days,
            business_info = EXCLUDED.business_info,
            updated_at = NOW()
        `,
        [
          ulid(),
          merchantUser.id,
          'ESUUQ Merchant Store',
          'esuuq-merchant-store',
          'Seeded merchant store for testing',
          'approved',
          8,
          JSON.stringify({ email: 'merchant@esuuq.local', phone: '+15550000002', address: '123 Merchant Way', taxId: 'TAX-12345' }),
        ],
      );
    }

    const customerUser = seededUsers.find((user) => user.role === 'customer');
    if (customerUser?.id) {
      await dataSource.query(
        `
          INSERT INTO addresses (
            id, user_id, type, full_name, email, phone, address_line1,
            address_line2, city, state, zip_code, country, is_default, lat, lng
          )
          VALUES ($1, $2, 'home', $3, $4, $5, $6, $7, $8, $9, $10, $11, true, 44.9778, -93.2650)
          ON CONFLICT DO NOTHING
        `,
        [
          ulid(),
          customerUser.id,
          'Aisha Khan',
          'customer@esuuq.local',
          '+15550000001',
          '88 Oak Street',
          'Apt 3B',
          'Minneapolis',
          'MN',
          '55372',
          'United States',
        ],
      );

      // Add a second address for the customer
      await dataSource.query(
        `
          INSERT INTO addresses (
            id, user_id, type, full_name, email, phone, address_line1,
            address_line2, city, state, zip_code, country, is_default, lat, lng
          )
          VALUES ($1, $2, 'work', $3, $4, $5, $6, $7, $8, $9, $10, $11, false, 44.9800, -93.2700)
          ON CONFLICT DO NOTHING
        `,
        [
          ulid(),
          customerUser.id,
          'Aisha Khan (Work)',
          'customer@esuuq.local',
          '+15550000001',
          '123 Downtown Plaza',
          'Suite 500',
          'Minneapolis',
          'MN',
          '55401',
          'United States',
        ],
      );
    }

    const coupons = [
      {
        code: 'ESUUQ10',
        description: '10% off any order',
        type: 'percentage',
        value: 10,
        scope: 'all',
        maxUses: 1000,
        isActive: true,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'SAVE10',
        description: '$10 off orders over $50',
        type: 'flat',
        value: 10,
        minOrderValue: 50,
        scope: 'all',
        maxUses: 500,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'FREESHIP',
        description: 'Free shipping on any order',
        type: 'free_shipping',
        value: 0,
        scope: 'all',
        maxUses: 200,
        isActive: true,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        code: 'WELCOME25',
        description: '25% off your first order',
        type: 'percentage',
        value: 25,
        scope: 'first_order',
        isActive: true,
      },
    ];

    for (const coupon of coupons) {
      await dataSource.query(
        `
          INSERT INTO coupons (
            id, code, description, type, value,
            min_order_value, scope, max_uses, is_active, expires_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (code)
          DO UPDATE SET
            description = EXCLUDED.description,
            type = EXCLUDED.type,
            value = EXCLUDED.value,
            min_order_value = EXCLUDED.min_order_value,
            scope = EXCLUDED.scope,
            max_uses = EXCLUDED.max_uses,
            is_active = EXCLUDED.is_active,
            expires_at = EXCLUDED.expires_at
        `,
        [
          ulid(),
          coupon.code,
          coupon.description,
          coupon.type,
          coupon.value,
          coupon.minOrderValue ?? null,
          coupon.scope,
          coupon.maxUses ?? null,
          coupon.isActive,
          coupon.expiresAt ?? null,
        ],
      );
    }

    // ── Seed Products ──
    const merchant = await dataSource.query(
      `SELECT id FROM merchants LIMIT 1`
    );
    const merchantId = merchant[0]?.id || ulid();

    const electronicsCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'electronics' LIMIT 1`
    );
    const electronicsId = electronicsCat[0]?.id || ulid();

    const fashionCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'fashion' LIMIT 1`
    );
    const fashionId = fashionCat[0]?.id || ulid();

    const homeGardenCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'home-garden' LIMIT 1`
    );
    const homeGardenId = homeGardenCat[0]?.id || ulid();

    const beautyCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'beauty' LIMIT 1`
    );
    const beautyId = beautyCat[0]?.id || ulid();

    const sportsCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'sports' LIMIT 1`
    );
    const sportsId = sportsCat[0]?.id || ulid();

    const foodGroceryCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'food-grocery' LIMIT 1`
    );
    const foodGroceryId = foodGroceryCat[0]?.id || ulid();

    const booksCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'books' LIMIT 1`
    );
    const booksId = booksCat[0]?.id || ulid();

    const toysKidsCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'toys-kids' LIMIT 1`
    );
    const toysKidsId = toysKidsCat[0]?.id || ulid();

    const toolsDiyCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'tools-diy' LIMIT 1`
    );
    const toolsDiyId = toolsDiyCat[0]?.id || ulid();

    const petSuppliesCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'pet-supplies' LIMIT 1`
    );
    const petSuppliesId = petSuppliesCat[0]?.id || ulid();

    const healthCat = await dataSource.query(
      `SELECT id FROM categories WHERE slug = 'health' LIMIT 1`
    );
    const healthId = healthCat[0]?.id || ulid();

    const products = [
      // Electronics
      {
        name: 'Wireless Bluetooth Headphones',
        slug: 'wireless-bluetooth-headphones-pro',
        description: 'Premium noise-cancelling wireless headphones with 30-hour battery life',
        price: 129.99,
        comparePrice: 199.99,
        stock: 50,
        sku: 'WBH-001',
        categoryId: electronicsId,
        isFeatured: true,
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop',
        ],
      },
      {
        name: '4K USB-C Hub',
        slug: '4k-usb-c-hub-adapter',
        description: 'All-in-one USB-C hub with HDMI, USB 3.0, and SD card reader',
        price: 49.99,
        comparePrice: 79.99,
        stock: 120,
        sku: 'HUB-001',
        categoryId: electronicsId,
        isFeatured: true,
        images: [
          'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&h=500&fit=crop',
          'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Smart Watch Pro',
        slug: 'smart-watch-pro-fitness',
        description: 'Advanced fitness tracker with heart rate monitor and 14-day battery',
        price: 199.99,
        comparePrice: 299.99,
        stock: 45,
        sku: 'SWP-001',
        categoryId: electronicsId,
        images: [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Portable SSD 1TB',
        slug: 'portable-ssd-1tb-external',
        description: 'Ultra-fast external SSD with USB 3.1 interface',
        price: 89.99,
        stock: 80,
        sku: 'SSD-001',
        categoryId: electronicsId,
        images: [
          'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Mechanical Gaming Keyboard',
        slug: 'mechanical-gaming-keyboard-rgb',
        description: 'RGB mechanical keyboard with custom switches and macro support',
        price: 79.99,
        comparePrice: 129.99,
        stock: 60,
        sku: 'KBD-001',
        categoryId: electronicsId,
        isFeatured: true,
        images: [
          'https://images.pexels.com/photos/1772123/pexels-photo-1772123.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      // Fashion
      {
        name: 'Classic Cotton T-Shirt',
        slug: 'classic-cotton-tshirt-unisex',
        description: '100% organic cotton comfortable everyday t-shirt. Available in multiple colors.',
        price: 19.99,
        comparePrice: 39.99,
        stock: 200,
        sku: 'TSH-001',
        categoryId: fashionId,
        isFeatured: true,
        images: [
          'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop',
          'https://images.unsplash.com/photo-1554521722-30f51e9c9b22?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Slim Fit Denim Jeans',
        slug: 'slim-fit-denim-jeans-mens',
        description: 'Premium stretch denim jeans with a modern slim fit',
        price: 59.99,
        comparePrice: 99.99,
        stock: 150,
        sku: 'JEANS-001',
        categoryId: fashionId,
        images: [
          'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      {
        name: 'Leather Messenger Bag',
        slug: 'leather-messenger-bag-brown',
        description: 'Genuine leather messenger bag perfect for work and travel',
        price: 149.99,
        comparePrice: 249.99,
        stock: 40,
        sku: 'BAG-001',
        categoryId: fashionId,
        isFeatured: true,
        images: [
          'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Wool Winter Coat',
        slug: 'wool-winter-coat-black',
        description: 'Warm and stylish wool coat for cold winters',
        price: 199.99,
        comparePrice: 349.99,
        stock: 35,
        sku: 'COAT-001',
        categoryId: fashionId,
        images: [
          'https://images.pexels.com/photos/7679720/pexels-photo-7679720.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      {
        name: 'Summer Linen Dress',
        slug: 'summer-linen-dress-floral',
        description: 'Breathable linen summer dress with vibrant patterns',
        price: 44.99,
        comparePrice: 79.99,
        stock: 120,
        sku: 'DRESS-001',
        categoryId: fashionId,
        images: [
          'https://picsum.photos/seed/summer-linen-dress/1200/1200',
        ],
      },
      // Home & Garden
      {
        name: 'Bamboo Cutting Board Set',
        slug: 'bamboo-cutting-board-set-3piece',
        description: 'Eco-friendly bamboo cutting boards with stainless steel handles',
        price: 24.99,
        comparePrice: 49.99,
        stock: 180,
        sku: 'BOARD-001',
        categoryId: homeGardenId,
        isFeatured: true,
        images: [
          'https://images.pexels.com/photos/6164041/pexels-photo-6164041.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      {
        name: 'Stainless Steel Cookware Set',
        slug: 'stainless-steel-cookware-set-10piece',
        description: 'Professional grade cookware set with tempered glass lids',
        price: 179.99,
        comparePrice: 299.99,
        stock: 50,
        sku: 'COOK-001',
        categoryId: homeGardenId,
        images: [
          'https://images.pexels.com/photos/6996088/pexels-photo-6996088.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      {
        name: 'Ceramic Dinner Plate Set',
        slug: 'ceramic-dinner-plate-set-12piece',
        description: 'Beautiful hand-painted ceramic dinnerware set',
        price: 59.99,
        comparePrice: 99.99,
        stock: 100,
        sku: 'PLATE-001',
        categoryId: homeGardenId,
        images: [
          'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Hanging Plant Pot',
        slug: 'hanging-plant-pot-ceramic',
        description: 'Beautiful ceramic hanging pot with drainage hole',
        price: 14.99,
        stock: 250,
        sku: 'POT-001',
        categoryId: homeGardenId,
        isFeatured: true,
        images: [
          'https://images.unsplash.com/photo-1521133573892-e44906baee46?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'LED Desk Lamp',
        slug: 'led-desk-lamp-adjustable',
        description: 'Modern LED lamp with adjustable brightness and color temperature',
        price: 34.99,
        comparePrice: 59.99,
        stock: 140,
        sku: 'LAMP-001',
        categoryId: homeGardenId,
        images: [
          'https://images.pexels.com/photos/11125530/pexels-photo-11125530.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      // Beauty
      {
        name: 'Organic Face Moisturizer',
        slug: 'organic-face-moisturizer-cream',
        description: 'Natural moisturizer with aloe vera and vitamin E',
        price: 22.99,
        comparePrice: 44.99,
        stock: 200,
        sku: 'MOIST-001',
        categoryId: beautyId,
        isFeatured: true,
        images: [
          'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Anti-Aging Face Serum',
        slug: 'anti-aging-face-serum-vitamin-c',
        description: 'Vitamin C serum for brighter and younger-looking skin',
        price: 34.99,
        comparePrice: 69.99,
        stock: 120,
        sku: 'SERUM-001',
        categoryId: beautyId,
        images: [
          'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Professional Hair Dryer',
        slug: 'professional-hair-dryer-ionic',
        description: 'Ionic hair dryer with multiple heat settings',
        price: 64.99,
        comparePrice: 129.99,
        stock: 80,
        sku: 'DRYER-001',
        categoryId: beautyId,
        isFeatured: true,
        images: [
          'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      {
        name: 'Makeup Brush Set',
        slug: 'makeup-brush-set-professional',
        description: 'Premium synthetic makeup brushes with elegant case',
        price: 29.99,
        comparePrice: 59.99,
        stock: 150,
        sku: 'BRUSH-001',
        categoryId: beautyId,
        images: [
          'https://images.pexels.com/photos/2113855/pexels-photo-2113855.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      {
        name: 'Natural Lipstick Collection',
        slug: 'natural-lipstick-collection-5colors',
        description: 'Set of 5 vibrant natural lipsticks with long-lasting formula',
        price: 19.99,
        comparePrice: 39.99,
        stock: 180,
        sku: 'LIPS-001',
        categoryId: beautyId,
        images: [
          'https://images.pexels.com/photos/2533266/pexels-photo-2533266.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      // Sports
      {
        name: 'Running Shoes Pro',
        slug: 'running-shoes-pro-athletic',
        description: 'Comfortable running shoes with advanced cushioning technology',
        price: 99.99,
        comparePrice: 179.99,
        stock: 100,
        sku: 'SHOES-001',
        categoryId: sportsId,
        isFeatured: true,
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Yoga Mat Premium',
        slug: 'yoga-mat-premium-non-slip',
        description: 'Extra thick yoga mat with non-slip surface',
        price: 39.99,
        comparePrice: 79.99,
        stock: 150,
        sku: 'YOGA-001',
        categoryId: sportsId,
        images: [
          'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Dumbbell Set',
        slug: 'dumbbell-set-adjustable-20kg',
        description: 'Adjustable dumbbell set with storage rack',
        price: 149.99,
        comparePrice: 249.99,
        stock: 60,
        sku: 'DUMB-001',
        categoryId: sportsId,
        isFeatured: true,
        images: [
          'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&h=500&fit=crop',
        ],
      },
      {
        name: 'Resistance Bands Set',
        slug: 'resistance-bands-set-5pack',
        description: 'Set of 5 resistance bands with different resistance levels',
        price: 19.99,
        stock: 200,
        sku: 'RESIST-001',
        categoryId: sportsId,
        images: [
          'https://images.pexels.com/photos/4397840/pexels-photo-4397840.jpeg?auto=compress&cs=tinysrgb&w=1200',
        ],
      },
      {
        name: 'Gym Water Bottle',
        slug: 'gym-water-bottle-stainless-1l',
        description: 'Insulated stainless steel water bottle that keeps drinks cold for 24 hours',
        price: 24.99,
        comparePrice: 44.99,
        stock: 220,
        sku: 'BOTTLE-001',
        categoryId: sportsId,
        images: [
          'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=500&h=500&fit=crop',
        ],
      },
      // Food & Grocery
      {
        name: 'Organic Basmati Rice 5kg',
        slug: 'organic-basmati-rice-5kg',
        description: 'Premium long-grain basmati rice sourced from organic farms.',
        price: 18.99,
        comparePrice: 24.99,
        stock: 180,
        sku: 'FOOD-001',
        categoryId: foodGroceryId,
        isFeatured: true,
        images: [
          'https://picsum.photos/seed/organic-basmati-rice/1200/1200',
        ],
      },
      {
        name: 'Extra Virgin Olive Oil 1L',
        slug: 'extra-virgin-olive-oil-1l',
        description: 'Cold-pressed olive oil ideal for cooking and salads.',
        price: 14.99,
        comparePrice: 21.99,
        stock: 140,
        sku: 'FOOD-002',
        categoryId: foodGroceryId,
        images: [
          'https://picsum.photos/seed/olive-oil-1l/1200/1200',
        ],
      },
      {
        name: 'Raw Honey Jar 500g',
        slug: 'raw-honey-jar-500g',
        description: 'Pure natural honey with rich floral notes.',
        price: 12.49,
        comparePrice: 17.99,
        stock: 120,
        sku: 'FOOD-003',
        categoryId: foodGroceryId,
        images: [
          'https://picsum.photos/seed/raw-honey-500g/1200/1200',
        ],
      },
      // Books
      {
        name: 'Deep Work Productivity Guide',
        slug: 'deep-work-productivity-guide',
        description: 'A practical handbook for focused work and productivity habits.',
        price: 16.99,
        comparePrice: 24.99,
        stock: 95,
        sku: 'BOOK-001',
        categoryId: booksId,
        isFeatured: true,
        images: [
          'https://picsum.photos/seed/deep-work-book/1200/1200',
        ],
      },
      {
        name: 'Modern JavaScript Patterns',
        slug: 'modern-javascript-patterns-book',
        description: 'Clean, reusable, and scalable patterns for JavaScript developers.',
        price: 29.99,
        comparePrice: 39.99,
        stock: 85,
        sku: 'BOOK-002',
        categoryId: booksId,
        images: [
          'https://picsum.photos/seed/javascript-patterns-book/1200/1200',
        ],
      },
      {
        name: 'Mindful Living Journal',
        slug: 'mindful-living-journal',
        description: 'A daily guided journal for self-reflection and mindfulness.',
        price: 11.99,
        comparePrice: 16.99,
        stock: 130,
        sku: 'BOOK-003',
        categoryId: booksId,
        images: [
          'https://picsum.photos/seed/mindful-journal/1200/1200',
        ],
      },
      // Toys & Kids
      {
        name: 'STEM Building Blocks Set',
        slug: 'stem-building-blocks-set',
        description: 'Creative STEM toy set to improve problem-solving skills for kids.',
        price: 34.99,
        comparePrice: 49.99,
        stock: 110,
        sku: 'TOY-001',
        categoryId: toysKidsId,
        isFeatured: true,
        images: [
          'https://picsum.photos/seed/stem-building-blocks/1200/1200',
        ],
      },
      {
        name: 'Remote Control Racing Car',
        slug: 'remote-control-racing-car-kids',
        description: 'Durable RC racing car with rechargeable battery.',
        price: 42.99,
        comparePrice: 59.99,
        stock: 75,
        sku: 'TOY-002',
        categoryId: toysKidsId,
        images: [
          'https://picsum.photos/seed/rc-racing-car-kids/1200/1200',
        ],
      },
      {
        name: 'Kids Art & Craft Kit',
        slug: 'kids-art-craft-kit',
        description: 'All-in-one art and craft set for fun creative projects.',
        price: 24.99,
        comparePrice: 34.99,
        stock: 140,
        sku: 'TOY-003',
        categoryId: toysKidsId,
        images: [
          'https://picsum.photos/seed/kids-art-craft-kit/1200/1200',
        ],
      },
      // Tools & DIY
      {
        name: 'Cordless Drill Kit 20V',
        slug: 'cordless-drill-kit-20v',
        description: 'Powerful cordless drill kit with drill bits and carry case.',
        price: 89.99,
        comparePrice: 129.99,
        stock: 65,
        sku: 'TOOL-001',
        categoryId: toolsDiyId,
        isFeatured: true,
        images: [
          'https://picsum.photos/seed/cordless-drill-kit/1200/1200',
        ],
      },
      {
        name: 'Multi-Bit Precision Screwdriver Set',
        slug: 'precision-screwdriver-set-multi-bit',
        description: 'Compact precision screwdriver set for electronics and home repairs.',
        price: 22.99,
        comparePrice: 32.99,
        stock: 150,
        sku: 'TOOL-002',
        categoryId: toolsDiyId,
        images: [
          'https://picsum.photos/seed/precision-screwdriver-set/1200/1200',
        ],
      },
      {
        name: 'Laser Distance Meter',
        slug: 'laser-distance-meter-diy',
        description: 'Accurate laser meter for quick indoor measurements.',
        price: 39.99,
        comparePrice: 54.99,
        stock: 90,
        sku: 'TOOL-003',
        categoryId: toolsDiyId,
        images: [
          'https://picsum.photos/seed/laser-distance-meter/1200/1200',
        ],
      },
      // Pet Supplies
      {
        name: 'Premium Dog Food 10kg',
        slug: 'premium-dog-food-10kg',
        description: 'Balanced nutrition dry food for adult dogs.',
        price: 39.99,
        comparePrice: 54.99,
        stock: 100,
        sku: 'PET-001',
        categoryId: petSuppliesId,
        isFeatured: true,
        images: [
          'https://picsum.photos/seed/premium-dog-food/1200/1200',
        ],
      },
      {
        name: 'Cat Scratching Post Tower',
        slug: 'cat-scratching-post-tower',
        description: 'Durable scratching post tower with play ball attachment.',
        price: 27.99,
        comparePrice: 39.99,
        stock: 85,
        sku: 'PET-002',
        categoryId: petSuppliesId,
        images: [
          'https://picsum.photos/seed/cat-scratching-post/1200/1200',
        ],
      },
      {
        name: 'Pet Grooming Brush Set',
        slug: 'pet-grooming-brush-set',
        description: 'Gentle de-shedding brush set for dogs and cats.',
        price: 15.99,
        comparePrice: 24.99,
        stock: 160,
        sku: 'PET-003',
        categoryId: petSuppliesId,
        images: [
          'https://picsum.photos/seed/pet-grooming-brush-set/1200/1200',
        ],
      },
      // Health
      {
        name: 'Digital Blood Pressure Monitor',
        slug: 'digital-blood-pressure-monitor',
        description: 'Automatic upper arm blood pressure monitor with memory storage.',
        price: 49.99,
        comparePrice: 69.99,
        stock: 105,
        sku: 'HLTH-001',
        categoryId: healthId,
        isFeatured: true,
        images: [
          'https://picsum.photos/seed/blood-pressure-monitor/1200/1200',
        ],
      },
      {
        name: 'Vitamin D3 Supplement 120ct',
        slug: 'vitamin-d3-supplement-120ct',
        description: 'Daily Vitamin D3 softgels for bone and immune support.',
        price: 13.99,
        comparePrice: 19.99,
        stock: 210,
        sku: 'HLTH-002',
        categoryId: healthId,
        images: [
          'https://picsum.photos/seed/vitamin-d3-120ct/1200/1200',
        ],
      },
      {
        name: 'Compact First Aid Kit',
        slug: 'compact-first-aid-kit-home',
        description: 'Portable first aid kit with emergency essentials for home and travel.',
        price: 21.99,
        comparePrice: 29.99,
        stock: 135,
        sku: 'HLTH-003',
        categoryId: healthId,
        images: [
          'https://picsum.photos/seed/compact-first-aid-kit/1200/1200',
        ],
      },
      // Flagged/Rejected Items for Moderation Testing
      {
        name: 'Suspicious Electronic Device',
        slug: 'suspicious-electronic-device',
        description: 'This item has been flagged for containing potentially restricted tech.',
        price: 999.99,
        stock: 1,
        sku: 'FLAG-001',
        categoryId: electronicsId,
        status: 'active',
        flagCount: 15,
        images: ['https://picsum.photos/seed/flag-001/1200/1200'],
      },
      {
        name: 'Policy Violating Product',
        slug: 'policy-violating-product',
        description: 'This product was rejected by a sub-admin due to policy violations.',
        price: 0.99,
        stock: 100,
        sku: 'REJ-001',
        categoryId: fashionId,
        status: 'rejected',
        images: ['https://picsum.photos/seed/rej-001/1200/1200'],
      },
    ];

    for (const product of products) {
      await dataSource.query(
        `
          INSERT INTO products (
            id, merchant_id, category_id, name, slug, description,
            price, compare_price, stock, sku, status, images, avg_rating,
            review_count, total_sold, is_featured, created_at, updated_at, flag_count
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), $17)
          ON CONFLICT (slug)
          DO UPDATE SET
            description = EXCLUDED.description,
            price = EXCLUDED.price,
            compare_price = EXCLUDED.compare_price,
            stock = EXCLUDED.stock,
            sku = EXCLUDED.sku,
            images = EXCLUDED.images,
            is_featured = EXCLUDED.is_featured,
            updated_at = NOW()
        `,
        [
          ulid(),
          merchantId,
          product.categoryId,
          product.name,
          product.slug,
          product.description,
          product.price,
          product.comparePrice ?? null,
          product.stock,
          product.sku,
          product.status || 'active',
          JSON.stringify(product.images || []),
          4.5,
          12,
          15,
          product.isFeatured ?? false,
          product.flagCount ?? (product.slug.includes('headphones') ? 3 : 0),
        ],
      );
    }

    // ── Seed Merchant Orders, Items, and Reviews ──
    const customerId = customerUser?.id;
    if (customerId && merchantId) {
      const addressRow = await dataSource.query(
        `SELECT id FROM addresses WHERE user_id = $1 ORDER BY is_default DESC LIMIT 1`,
        [customerId],
      );
      const addressId = addressRow[0]?.id;

      const merchantProducts = await dataSource.query(
        `SELECT id, name, images, price FROM products WHERE merchant_id = $1 ORDER BY created_at ASC LIMIT 6`,
        [merchantId],
      );

      if (addressId && merchantProducts.length >= 3) {
        const orderSeeds = [
          {
            id: 'ESQ-2026-10001',
            status: 'delivered',
            shippingMethod: 'express',
            shippingFee: 7.99,
            discount: 10,
            createdDaysAgo: 6,
            deliveredDaysAgo: 4,
            items: [
              { product: merchantProducts[0], quantity: 1 },
              { product: merchantProducts[1], quantity: 2 },
            ],
          },
          {
            id: 'ESQ-2026-10002',
            status: 'processing',
            shippingMethod: 'free',
            shippingFee: 0,
            discount: 0,
            createdDaysAgo: 3,
            items: [
              { product: merchantProducts[2], quantity: 1 },
            ],
          },
          {
            id: 'ESQ-2026-10003',
            status: 'in_transit',
            shippingMethod: 'next_day',
            shippingFee: 19.99,
            discount: 0,
            createdDaysAgo: 2,
            items: [
              { product: merchantProducts[3] || merchantProducts[1], quantity: 1 },
            ],
          },
          {
            id: 'ESQ-2026-10004',
            status: 'confirmed',
            shippingMethod: 'free',
            shippingFee: 0,
            discount: 0,
            createdDaysAgo: 1,
            items: [
              { product: merchantProducts[4] || merchantProducts[0], quantity: 1 },
            ],
          },
        ];

        let deliveredEarnings = 0;

        for (const seed of orderSeeds) {
          const subtotal = seed.items.reduce(
            (sum, item) => sum + Number(item.product.price || 0) * item.quantity,
            0,
          );
          const total = Math.max(0, subtotal - seed.discount + seed.shippingFee);
          const createdAt = new Date(Date.now() - seed.createdDaysAgo * 24 * 60 * 60 * 1000);
          const deliveredAt = seed.status === 'delivered'
            ? new Date(Date.now() - (seed.deliveredDaysAgo || 1) * 24 * 60 * 60 * 1000)
            : null;

          const statusHistory = [
            { status: 'confirmed', changedAt: createdAt.toISOString() },
          ];
          if (['processing', 'ready_for_pickup', 'picked_up', 'in_transit', 'delivered'].includes(seed.status)) {
            statusHistory.push({
              status: 'processing',
              changedAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
            });
          }
          if (['in_transit', 'delivered'].includes(seed.status)) {
            statusHistory.push({
              status: 'in_transit',
              changedAt: new Date(createdAt.getTime() + 6 * 60 * 60 * 1000).toISOString(),
            });
          }
          if (seed.status === 'delivered' && deliveredAt) {
            statusHistory.push({ status: 'delivered', changedAt: deliveredAt.toISOString() });
          }

          await dataSource.query(
            `
              INSERT INTO orders (
                id, customer_id, address_id, status, shipping_method,
                subtotal, shipping_fee, discount, total,
                coupon_code, stripe_payment_intent_id, delivery_otp,
                status_history, estimated_delivery, delivered_at,
                created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16, $17)
              ON CONFLICT (id)
              DO UPDATE SET
                status = EXCLUDED.status,
                shipping_method = EXCLUDED.shipping_method,
                subtotal = EXCLUDED.subtotal,
                shipping_fee = EXCLUDED.shipping_fee,
                discount = EXCLUDED.discount,
                total = EXCLUDED.total,
                status_history = EXCLUDED.status_history,
                estimated_delivery = EXCLUDED.estimated_delivery,
                delivered_at = EXCLUDED.delivered_at,
                updated_at = EXCLUDED.updated_at
            `,
            [
              seed.id,
              customerId,
              addressId,
              seed.status,
              seed.shippingMethod,
              Number(subtotal.toFixed(2)),
              Number(seed.shippingFee.toFixed(2)),
              Number(seed.discount.toFixed(2)),
              Number(total.toFixed(2)),
              seed.discount > 0 ? 'SAVE10' : null,
              `pi_seed_${seed.id}`,
              `$2b$10$seededotpplaceholderhash00000000000000000000000000000`,
              JSON.stringify(statusHistory),
              new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
              deliveredAt,
              createdAt,
              new Date(),
            ],
          );

          for (const item of seed.items) {
            const unitPrice = Number(item.product.price || 0);
            const totalPrice = Number((unitPrice * item.quantity).toFixed(2));
            const commission = Number((totalPrice * 0.08).toFixed(2));
            const merchantEarnings = Number((totalPrice - commission).toFixed(2));

            if (seed.status === 'delivered') {
              deliveredEarnings += merchantEarnings;
            }

            await dataSource.query(
              `
                INSERT INTO order_items (
                  id, order_id, product_id, merchant_id, quantity,
                  unit_price, total_price, variant_id, variant_snapshot,
                  product_name, product_image, commission, merchant_earnings
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, $8, $9, $10, $11)
                ON CONFLICT (id)
                DO UPDATE SET
                  quantity = EXCLUDED.quantity,
                  unit_price = EXCLUDED.unit_price,
                  total_price = EXCLUDED.total_price,
                  product_name = EXCLUDED.product_name,
                  product_image = EXCLUDED.product_image,
                  commission = EXCLUDED.commission,
                  merchant_earnings = EXCLUDED.merchant_earnings
              `,
              [
                ulid(),
                seed.id,
                item.product.id,
                merchantId,
                item.quantity,
                unitPrice,
                totalPrice,
                item.product.name,
                Array.isArray(item.product.images) ? item.product.images[0] : null,
                commission,
                merchantEarnings,
              ],
            );
          }
        }

        await dataSource.query(
          `
            UPDATE merchants
            SET
              available_balance = $2,
              total_revenue = $2,
              avg_rating = 4.7,
              updated_at = NOW()
            WHERE id = $1
          `,
          [merchantId, Number(deliveredEarnings.toFixed(2))],
        );

        const deliveredOrder = orderSeeds.find((o) => o.status === 'delivered');
        if (deliveredOrder) {
          const reviewSeeds = [
            {
              product: deliveredOrder.items[0]?.product,
              rating: 5,
              title: 'Excellent quality',
              comment: 'Fast shipping and exactly as described. Very happy with this purchase.',
              reply: 'Thank you for your feedback. We appreciate your support.',
            },
            {
              product: deliveredOrder.items[1]?.product,
              rating: 4,
              title: 'Good value',
              comment: 'Great value for money. Packaging was good and delivery was on time.',
            },
            {
              product: deliveredOrder.items[0]?.product,
              rating: 1,
              title: 'Terrible service',
              comment: 'The product arrived broken and the merchant is ignoring my messages!',
              status: 'flagged',
              flagCount: 8,
            },
          ].filter((entry) => !!entry.product?.id);

          for (const review of reviewSeeds) {
            await dataSource.query(
              `
                INSERT INTO reviews (
                  id, product_id, user_id, order_id, rating,
                  title, comment, images, is_verified_purchase,
                  helpful_count, status, flag_count, merchant_reply,
                  merchant_replied_at, merchant_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, true, $8, $9, $10, $11, $12, $13)
                ON CONFLICT (id)
                DO NOTHING
              `,
              [
                ulid(),
                review.product.id,
                customerId,
                deliveredOrder.id,
                review.rating,
                review.title,
                review.comment,
                review.rating >= 5 ? 3 : 1,
                review.status || (review.rating < 3 ? 'flagged' : 'approved'),
                review.flagCount || (review.rating < 3 ? 5 : 0),
                review.reply || null,
                review.reply ? new Date() : null,
                merchantId,
              ],
            );
          }

          for (const review of reviewSeeds) {
            await dataSource.query(
              `
                UPDATE products
                SET
                  avg_rating = sub.avg_rating,
                  review_count = sub.review_count,
                  updated_at = NOW()
                FROM (
                  SELECT
                    product_id,
                    ROUND(AVG(rating)::numeric, 1) AS avg_rating,
                    COUNT(*)::int AS review_count
                  FROM reviews
                  WHERE product_id = $1
                    AND status = 'approved'
                  GROUP BY product_id
                ) sub
                WHERE products.id = sub.product_id
              `,
              [review.product.id],
            );
          }
          }
        }

        // ── Seed Sub-Admin Permissions ──
        const subAdminUser = seededUsers.find(u => u.role === 'sub_admin');
        if (subAdminUser) {
          await dataSource.query(`
            INSERT INTO sub_admin_permissions (
              id, user_id, can_manage_users, can_manage_disputes,
              can_approve_merchants, can_moderate_reviews, can_view_dashboard,
              can_edit_permissions
            )
            VALUES ($1, $2, true, true, true, true, true, false)
            ON CONFLICT (user_id) DO NOTHING
          `, [ulid(), subAdminUser.id]);
        }

        // ── Seed Disputes ──
        const orders = await dataSource.query(`
          SELECT o.id, o.customer_id, oi.merchant_id 
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          LIMIT 2
        `);
        if (orders.length >= 2) {
          // 1. Pending Dispute
          await dataSource.query(`
            INSERT INTO disputes (
              id, order_id, customer_id, merchant_id, reason,
              description, status, notes
            )
            VALUES ($1, $2, $3, $4, 'item_not_as_described', 
                    'The product color is significantly different from photos.', 'pending', '[]'::jsonb)
          `, [ulid(), orders[0].id, orders[0].customer_id, orders[0].merchant_id]);

          // 2. Resolved Dispute
          await dataSource.query(`
            INSERT INTO disputes (
              id, order_id, customer_id, merchant_id, reason,
              description, status, resolution, notes
            )
            VALUES ($1, $2, $3, $4, 'defective', 
                    'Device wont turn on after charging.', 'resolved', 
                    'Full refund issued after merchant confirmed receipt of return.', 
                    $5::jsonb)
          `, [
            ulid(), 
            orders[1].id, 
            orders[1].customer_id, 
            orders[1].merchant_id,
            JSON.stringify([{
              authorId: seededUsers.find(u => u.role === 'admin')?.id,
              authorName: 'System Admin',
              content: 'Merchant has been notified to provide return label.',
              createdAt: new Date().toISOString()
            }])
          ]);
        }

        // ── Seed Admin Activity Logs ──
        const adminId = seededUsers.find(u => u.role === 'admin')?.id;
        if (adminId) {
          const logActions = [
            { action: 'approve_merchant', type: 'merchant', target: merchantId },
            { action: 'update_platform_settings', type: 'system', target: 'global' },
            { action: 'warn_user', type: 'user', target: customerId },
            { action: 'moderate_review', type: 'review', target: 'rev-001' },
            { action: 'resolve_dispute', type: 'dispute', target: 'disp-001' }
          ];

          for (const log of logActions) {
            await dataSource.query(`
              INSERT INTO admin_activity_logs (id, admin_id, action, target_type, target_id, details)
              VALUES ($1, $2, $3, $4, $5, $6::jsonb)
            `, [ulid(), adminId, log.action, log.type, log.target, JSON.stringify({ ip: '127.0.0.1', timestamp: new Date().toISOString() })]);
          }
        }
      }

    console.log('Seed complete: database reset and reloaded.');
    console.table(
      seededUsers.map((user) => ({
        role: user.role,
        email: user.email,
        password: user.password,
      })),
    );
  } finally {
    await dataSource.destroy();
  }
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
