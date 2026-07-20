"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const nodemailer = __importStar(require("nodemailer"));
const form_data_1 = __importDefault(require("form-data"));
const mailgun_js_1 = __importDefault(require("mailgun.js"));
const notification_entity_1 = require("../database/entities/notification.entity");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const notifications_gateway_1 = require("./notifications.gateway");
const ulid_1 = require("ulid");
const user_entity_1 = require("../database/entities/user.entity");
function toMsg(err) {
    return err instanceof Error ? err.message : String(err);
}
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(config, appNotificationRepo, merchantRepo, userRepo, gateway) {
        this.config = config;
        this.appNotificationRepo = appNotificationRepo;
        this.merchantRepo = merchantRepo;
        this.userRepo = userRepo;
        this.gateway = gateway;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.mailgunClient = null;
        this.mailgunDomain = '';
        this.mailgunFromSms = '';
        this.firebaseReady = false;
    }
    async onModuleInit() {
        await this.initEmailTransporter();
        this.initMailgun();
        await this.initFirebase();
    }
    async initEmailTransporter() {
        try {
            this.emailTransporter = nodemailer.createTransport({
                host: this.config.get('SMTP_HOST', 'smtp.gmail.com'),
                port: this.config.get('SMTP_PORT', 587),
                secure: false,
                auth: {
                    user: this.config.get('SMTP_USER'),
                    pass: this.config.get('SMTP_PASS'),
                },
            });
            await this.emailTransporter.verify();
            this.logger.log('✅ Email transporter (Nodemailer) initialized');
        }
        catch (error) {
            this.logger.error('❌ Email transporter failed:', toMsg(error));
            this.emailTransporter = nodemailer.createTransport({ jsonTransport: true });
        }
    }
    initMailgun() {
        const apiKey = this.config.get('MAILGUN_API_KEY', '');
        const domain = this.config.get('MAILGUN_DOMAIN', '');
        if (!apiKey || apiKey === 'your-mailgun-api-key') {
            this.logger.warn('⚠️  Mailgun API key not configured — SMS disabled');
            return;
        }
        try {
            const mg = new mailgun_js_1.default(form_data_1.default);
            this.mailgunClient = mg.client({ username: 'api', key: apiKey });
            this.mailgunDomain = domain;
            this.mailgunFromSms = this.config.get('MAILGUN_FROM_SMS', '');
            this.logger.log('✅ Mailgun client initialized');
        }
        catch (error) {
            this.logger.error('❌ Mailgun init failed:', toMsg(error));
            this.mailgunClient = null;
        }
    }
    async initFirebase() {
        const projectId = this.config.get('FIREBASE_PROJECT_ID', '');
        const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL', '');
        const privateKey = this.config
            .get('FIREBASE_PRIVATE_KEY', '')
            .replace(/\\n/g, '\n');
        const hasValidPem = privateKey.includes('BEGIN PRIVATE KEY') &&
            privateKey.includes('END PRIVATE KEY');
        if (!projectId || !clientEmail || !hasValidPem) {
            this.logger.warn('⚠️  Firebase credentials incomplete — push disabled');
            return;
        }
        try {
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
                });
            }
            this.firebaseReady = true;
            this.logger.log('✅ Firebase initialized');
        }
        catch (err) {
            this.logger.warn(`⚠️  Firebase disabled: ${toMsg(err)}`);
        }
    }
    async sendEmail(to, subject, html, text) {
        try {
            const info = await this.emailTransporter.sendMail({
                from: {
                    name: this.config.get('SENDGRID_FROM_NAME', 'ESUUQ'),
                    address: this.config.get('SMTP_FROM', 'noreply@esuuq.com'),
                },
                to,
                subject,
                html,
                text: text ?? this.stripHtml(html),
            });
            this.logger.log(`📧 Email sent to ${to}: ${info.messageId}`);
            return info;
        }
        catch (error) {
            this.logger.error(`❌ Failed to send email to ${to}:`, toMsg(error));
        }
    }
    async sendOtpEmail(to, otp) {
        await this.sendEmail(to, `Your ESUUQ verification code: ${otp}`, this.otpEmailHtml(otp));
    }
    async sendPasswordResetOtpEmail(to, otp, expiresInMinutes = 10) {
        await this.sendEmail(to, `Your ESUUQ password reset code: ${otp}`, this.passwordResetEmailHtml(otp, expiresInMinutes));
    }
    async sendOrderConfirmation(to, orderId, total, otp) {
        if (!this.isOrderEmailEnabled())
            return;
        await this.sendEmail(to, `Order Confirmed — ${orderId}`, this.orderConfirmHtml(orderId, total, otp));
    }
    async sendOrderStatusUpdate(to, orderId, newStatus) {
        if (!this.isOrderEmailEnabled())
            return;
        await this.sendEmail(to, `Order ${orderId} — ${newStatus.replace(/_/g, ' ').toUpperCase()}`, `<p>Your order <strong>${orderId}</strong> is now <strong>${newStatus}</strong>.</p>`);
    }
    async sendOtpSms(phone, otp) {
        if (!this.isSmsEnabled()) {
            this.logger.debug('SMS notifications disabled via config');
            return;
        }
        if (!this.mailgunClient) {
            this.logger.warn('⚠️  Mailgun client not available — skipping SMS');
            return;
        }
        if (!this.mailgunDomain) {
            this.logger.error('❌ MAILGUN_DOMAIN not configured');
            return;
        }
        try {
            await this.mailgunClient.messages.create(this.mailgunDomain, {
                from: `ESUUQ SMS <${this.mailgunFromSms}>`,
                to: [phone],
                text: `Your ESUUQ verification code is: ${otp}. It expires in 10 minutes.`,
            });
            this.logger.log(`📱 SMS sent to ${phone}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to send SMS to ${phone}:`, toMsg(error));
        }
    }
    async sendPush(fcmToken, title, body, data) {
        if (!this.isPushEnabled() || !this.firebaseReady)
            return;
        try {
            const admin = require('firebase-admin');
            await admin.messaging().send({
                token: fcmToken,
                notification: { title, body },
                data,
                android: { priority: 'high' },
                apns: { payload: { aps: { sound: 'default', badge: 1 } } },
            });
            this.logger.log('📲 Push notification sent');
        }
        catch (err) {
            this.logger.error('❌ Push notification failed:', toMsg(err));
        }
    }
    async sendNewOrderToDriver(driverFcmToken, orderId, earnings) {
        await this.sendPush(driverFcmToken, '⚡ New Delivery Order', `Order #${orderId} — Earn $${earnings.toFixed(2)}`, { orderId, type: 'new_order' });
    }
    async sendNewOrderToMerchant(merchantFcmToken, orderId) {
        await this.sendPush(merchantFcmToken, '📦 New Order Received', `Order ${orderId} needs your attention`, { orderId, type: 'new_order' });
    }
    async sendLowStockAlert(merchantId, product) {
        const recipientUserId = await this.resolveNotificationRecipientUserId(merchantId);
        await this.createNotification(recipientUserId, '⚠️ Low Stock Alert', `Your product "${product.name}" is running low (${product.stock} left).`, notification_entity_1.NotificationType.SYSTEM);
    }
    async sendOutOfStockAlert(merchantId, product) {
        const recipientUserId = await this.resolveNotificationRecipientUserId(merchantId);
        await this.createNotification(recipientUserId, '⛔ Out of Stock', `Your product "${product.name}" is now out of stock.`, notification_entity_1.NotificationType.SYSTEM);
    }
    async createNotificationForMerchant(merchantId, title, message, type = notification_entity_1.NotificationType.SYSTEM, actionUrl) {
        const recipientUserId = await this.resolveNotificationRecipientUserId(merchantId);
        return this.createNotification(recipientUserId, title, message, type, actionUrl);
    }
    async createNotificationsForRoles(roles, title, message, type = notification_entity_1.NotificationType.SYSTEM, actionUrl) {
        const recipients = await this.userRepo.find({
            where: { role: (0, typeorm_2.In)(roles), isActive: true },
            select: ['id'],
        });
        for (const recipient of recipients) {
            await this.createNotification(recipient.id, title, message, type, actionUrl);
        }
        return { sent: recipients.length };
    }
    async notifySubAdmins(title, message, type = notification_entity_1.NotificationType.SYSTEM, actionUrl) {
        return this.createNotificationsForRoles([user_entity_1.UserRole.SUB_ADMIN, user_entity_1.UserRole.ADMIN], title, message, type, actionUrl);
    }
    async createNotification(userId, title, message, type = notification_entity_1.NotificationType.SYSTEM, actionUrl) {
        const notification = this.appNotificationRepo.create({
            id: (0, ulid_1.ulid)(),
            userId,
            title,
            message,
            type,
            actionUrl,
        });
        const saved = await this.appNotificationRepo.save(notification);
        this.gateway.sendToUser(userId, 'new_notification', saved);
        if (this.isPushEnabled() && this.firebaseReady) {
            try {
                const user = await this.userRepo.findOne({
                    where: { id: userId },
                    select: ['fcmToken'],
                });
                if (user?.fcmToken) {
                    await this.sendPush(user.fcmToken, title, message, actionUrl ? { actionUrl } : {});
                }
            }
            catch (err) {
                this.logger.error('❌ Failed to send FCM push:', toMsg(err));
            }
        }
        return saved;
    }
    async getUserNotifications(userId, page = 1, limit = 20) {
        const [data, total] = await this.appNotificationRepo.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            data,
            meta: { total, page, limit, unread: await this.countUnread(userId) },
        };
    }
    async markAsRead(id, userId) {
        await this.appNotificationRepo.update({ id, userId }, { isRead: true });
        return { success: true };
    }
    async markAllAsRead(userId) {
        await this.appNotificationRepo.update({ userId, isRead: false }, { isRead: true });
        return { success: true };
    }
    async countUnread(userId) {
        return this.appNotificationRepo.count({ where: { userId, isRead: false } });
    }
    async resolveNotificationRecipientUserId(merchantIdOrUserId) {
        const merchant = await this.merchantRepo.findOne({
            where: { id: merchantIdOrUserId },
            select: ['id', 'userId'],
        });
        return merchant?.userId ?? merchantIdOrUserId;
    }
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    isSmsEnabled() {
        return this.config.get('ENABLE_SMS_NOTIFICATIONS', 'false') === 'true';
    }
    isPushEnabled() {
        return this.config.get('ENABLE_PUSH_NOTIFICATIONS', 'false') === 'true';
    }
    isOrderEmailEnabled() {
        return this.config.get('ENABLE_ORDER_EMAIL_NOTIFICATIONS', 'false') === 'true';
    }
    otpEmailHtml(otp) {
        return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#0A0F1E;color:#F8FAFC;border-radius:12px;">
        <div style="font-size:2rem;font-weight:800;margin-bottom:1rem;">ES<span style="color:#00C9A7">UUQ</span></div>
        <h2 style="margin-bottom:0.5rem;">Verify Your Account</h2>
        <p style="color:#94A3B8;margin-bottom:1.5rem;">Use the code below to verify your account. It expires in 10 minutes.</p>
        <div style="background:#1E2A3A;padding:1.5rem;border-radius:8px;text-align:center;letter-spacing:0.5em;font-size:2rem;font-weight:700;color:#00C9A7;margin-bottom:1.5rem;">${otp}</div>
        <p style="color:#94A3B8;font-size:0.8rem;">If you didn't request this, you can safely ignore this email.</p>
      </div>`;
    }
    passwordResetEmailHtml(otp, expiresInMinutes) {
        return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#0A0F1E;color:#F8FAFC;border-radius:12px;">
        <div style="font-size:2rem;font-weight:800;margin-bottom:1rem;">ES<span style="color:#00C9A7">UUQ</span></div>
        <h2 style="margin-bottom:0.5rem;">Reset Your Password</h2>
        <p style="color:#94A3B8;margin-bottom:1.5rem;">Use the code below to reset your password. It expires in ${expiresInMinutes} minutes.</p>
        <div style="background:#1E2A3A;padding:1.5rem;border-radius:8px;text-align:center;letter-spacing:0.5em;font-size:2rem;font-weight:700;color:#00C9A7;margin-bottom:1.5rem;">${otp}</div>
        <p style="color:#94A3B8;font-size:0.8rem;">If you didn't request this reset, you can safely ignore this email.</p>
      </div>`;
    }
    orderConfirmHtml(orderId, total, otp) {
        return `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;">
        <div style="font-size:2rem;font-weight:800;margin-bottom:1rem;color:#0A0F1E;">ES<span style="color:#00C9A7">UUQ</span></div>
        <h2>Order Confirmed ✅</h2>
        <p>Your order <strong>${orderId}</strong> has been confirmed. Total: <strong>$${total.toFixed(2)}</strong></p>
        <p>Your delivery confirmation code (share with driver): <strong style="font-size:1.5rem;color:#00C9A7;">${otp}</strong></p>
        <p style="color:#666;font-size:0.8rem;">Keep this safe — you'll need it when the driver arrives.</p>
      </div>`;
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(notification_entity_1.AppNotification)),
    __param(2, (0, typeorm_1.InjectRepository)(supporting_entities_1.Merchant)),
    __param(3, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        notifications_gateway_1.NotificationsGateway])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map