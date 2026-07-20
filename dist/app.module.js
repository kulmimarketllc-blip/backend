"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const throttler_1 = require("@nestjs/throttler");
const cache_manager_1 = require("@nestjs/cache-manager");
const bull_1 = require("@nestjs/bull");
const schedule_1 = require("@nestjs/schedule");
const cache_manager_redis_yet_1 = require("cache-manager-redis-yet");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const merchants_module_1 = require("./merchants/merchants.module");
const products_module_1 = require("./products/products.module");
const orders_module_1 = require("./orders/orders.module");
const payments_module_1 = require("./payments/payments.module");
const delivery_module_1 = require("./delivery/delivery.module");
const notifications_module_1 = require("./notifications/notifications.module");
const admin_module_1 = require("./admin/admin.module");
const reviews_module_1 = require("./reviews/reviews.module");
const coupons_module_1 = require("./coupons/coupons.module");
const search_module_1 = require("./search/search.module");
const support_module_1 = require("./support/support.module");
const sub_admin_module_1 = require("./sub-admin/sub-admin.module");
const app_controller_1 = require("./app.controller");
const snake_naming_strategy_1 = require("./database/snake-naming.strategy");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('DATABASE_HOST'),
                    port: config.get('DATABASE_PORT', 5432),
                    database: config.get('DATABASE_NAME'),
                    username: config.get('DATABASE_USER'),
                    password: config.get('DATABASE_PASSWORD'),
                    ssl: config.get('DATABASE_SSL') === 'true' ? { rejectUnauthorized: false } : false,
                    autoLoadEntities: true,
                    synchronize: config.get('DATABASE_SYNC') === 'true',
                    logging: config.get('DATABASE_LOGGING') === 'true',
                    namingStrategy: new snake_naming_strategy_1.SnakeNamingStrategy(),
                    migrations: ['dist/database/migrations/*.js'],
                    migrationsRun: false,
                }),
            }),
            cache_manager_1.CacheModule.registerAsync({
                isGlobal: true,
                inject: [config_1.ConfigService],
                useFactory: async (config) => ({
                    store: await (0, cache_manager_redis_yet_1.redisStore)({
                        socket: {
                            host: config.get('REDIS_HOST', 'localhost'),
                            port: config.get('REDIS_PORT', 6379),
                        },
                        password: config.get('REDIS_PASSWORD') || undefined,
                    }),
                    ttl: config.get('REDIS_TTL', 300) * 1000,
                }),
            }),
            bull_1.BullModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    redis: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                        password: config.get('REDIS_PASSWORD') || undefined,
                    },
                }),
            }),
            throttler_1.ThrottlerModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ([{
                        ttl: config.get('THROTTLE_TTL', 900) * 1000,
                        limit: config.get('THROTTLE_LIMIT', 100),
                    }]),
            }),
            schedule_1.ScheduleModule.forRoot(),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            merchants_module_1.MerchantsModule,
            products_module_1.ProductsModule,
            orders_module_1.OrdersModule,
            payments_module_1.PaymentsModule,
            delivery_module_1.DeliveryModule,
            notifications_module_1.NotificationsModule,
            admin_module_1.AdminModule,
            reviews_module_1.ReviewsModule,
            coupons_module_1.CouponsModule,
            search_module_1.SearchModule,
            support_module_1.SupportModule,
            sub_admin_module_1.SubAdminModule,
        ],
        controllers: [app_controller_1.AppController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map