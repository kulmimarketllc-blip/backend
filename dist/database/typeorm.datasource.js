"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv_1 = require("dotenv");
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./entities/user.entity");
const supporting_entities_1 = require("./entities/supporting.entities");
const product_entity_1 = require("./entities/product.entity");
const order_entity_1 = require("./entities/order.entity");
const review_coupon_entities_1 = require("./entities/review-coupon.entities");
const platform_setting_entity_1 = require("./entities/platform-setting.entity");
const support_ticket_entity_1 = require("./entities/support-ticket.entity");
const snake_naming_strategy_1 = require("./snake-naming.strategy");
(0, dotenv_1.config)({ path: '.env.local' });
(0, dotenv_1.config)({ path: '.env' });
const parseNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
const isSslEnabled = String(process.env.DATABASE_SSL || 'false') === 'true';
exports.default = new typeorm_1.DataSource({
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
        user_entity_1.User,
        supporting_entities_1.Merchant,
        supporting_entities_1.Address,
        supporting_entities_1.Category,
        supporting_entities_1.Wishlist,
        product_entity_1.Product,
        order_entity_1.Order,
        order_entity_1.OrderItem,
        review_coupon_entities_1.Review,
        review_coupon_entities_1.ReviewHelpful,
        review_coupon_entities_1.Coupon,
        review_coupon_entities_1.CouponUsage,
        platform_setting_entity_1.PlatformSetting,
        support_ticket_entity_1.SupportTicket,
        support_ticket_entity_1.SupportTicketReply,
    ],
    namingStrategy: new snake_naming_strategy_1.SnakeNamingStrategy(),
    migrations: ['src/database/migrations/*.{ts,js}'],
    migrationsTableName: 'migrations',
});
//# sourceMappingURL=typeorm.datasource.js.map