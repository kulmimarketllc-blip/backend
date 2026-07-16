import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

import { User } from './entities/user.entity';
import { Merchant, Address, Category, Wishlist } from './entities/supporting.entities';
import { Product } from './entities/product.entity';
import { Order, OrderItem } from './entities/order.entity';
import { Review, ReviewHelpful, Coupon, CouponUsage } from './entities/review-coupon.entities';
import { PlatformSetting } from './entities/platform-setting.entity';
import { SupportTicket, SupportTicketReply } from './entities/support-ticket.entity';
import { SnakeNamingStrategy } from './snake-naming.strategy';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

const parseNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isSslEnabled = String(process.env.DATABASE_SSL || 'false') === 'true';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseNumber(process.env.DATABASE_PORT, 5432),
  database: process.env.DATABASE_NAME,
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: isSslEnabled ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: String(process.env.DATABASE_LOGGING || 'false') === 'true',
  entities: [
    User,
    Merchant,
    Address,
    Category,
    Wishlist,
    Product,
    Order,
    OrderItem,
    Review,
    ReviewHelpful,
    Coupon,
    CouponUsage,
    PlatformSetting,
    SupportTicket,
    SupportTicketReply,
  ],
  namingStrategy: new SnakeNamingStrategy(),
  migrations: ['src/database/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
});