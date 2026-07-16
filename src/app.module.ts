import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-redis-yet';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MerchantsModule } from './merchants/merchants.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { DeliveryModule } from './delivery/delivery.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CouponsModule } from './coupons/coupons.module';
import { SearchModule } from './search/search.module';
import { SupportModule } from './support/support.module';
import { SubAdminModule } from './sub-admin/sub-admin.module';
import { AppController } from './app.controller';
import { SnakeNamingStrategy } from './database/snake-naming.strategy';

@Module({
  imports: [
    // ── Config ──
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Database ──
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT', 5432),
        database: config.get('DATABASE_NAME'),
        username: config.get('DATABASE_USER'),
        password: config.get('DATABASE_PASSWORD'),
        ssl: config.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
        autoLoadEntities: true,
        synchronize: config.get('DATABASE_SYNC') === 'true',
        logging: config.get('DATABASE_LOGGING') === 'true',
        namingStrategy: new SnakeNamingStrategy(),
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
      }),
    }),

    // ── Redis Cache ──
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.get('REDIS_HOST', 'localhost'),
            port: config.get<number>('REDIS_PORT', 6379),
          },
          password: config.get('REDIS_PASSWORD') || undefined,
        }),
        ttl: config.get<number>('REDIS_TTL', 300) * 1000,
      }),
    }),

    // ── Bull Job Queues ──
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    // ── Rate Limiting ──
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.get<number>('THROTTLE_TTL', 900) * 1000,
        limit: config.get<number>('THROTTLE_LIMIT', 100),
      }]),
    }),

    // ── Scheduled Tasks ──
    ScheduleModule.forRoot(),

    // ── Feature Modules ──
    AuthModule,
    UsersModule,
    MerchantsModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    DeliveryModule,
    NotificationsModule,
    AdminModule,
    ReviewsModule,
    CouponsModule,
    SearchModule,
    SupportModule,
    SubAdminModule,
  ],
  controllers: [AppController],
})
export class AppModule { }
