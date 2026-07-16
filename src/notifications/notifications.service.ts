// notifications/notifications.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as nodemailer from 'nodemailer';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';
import { AppNotification, NotificationType } from '../database/entities/notification.entity';
import { Merchant } from '../database/entities/supporting.entities';
import { NotificationsGateway } from './notifications.gateway';
import { ulid } from 'ulid';
import { User, UserRole } from '../database/entities/user.entity';

// ── Safe error-message extractor ─────────────────────────────────────
function toMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private emailTransporter!: nodemailer.Transporter;
  private mailgunClient: ReturnType<InstanceType<typeof Mailgun>['client']> | null = null;
  private mailgunDomain = '';
  private mailgunFromSms = '';
  private firebaseReady = false;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AppNotification)
    private readonly appNotificationRepo: Repository<AppNotification>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly gateway: NotificationsGateway,
  ) { }

  async onModuleInit() {
    await this.initEmailTransporter();
    this.initMailgun();
    await this.initFirebase();
  }

  // ── INIT ──────────────────────────────────────────────────────────

  private async initEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: false,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
      await this.emailTransporter.verify();
      this.logger.log('✅ Email transporter (Nodemailer) initialized');
    } catch (error: unknown) {
      this.logger.error('❌ Email transporter failed:', toMsg(error));
      // Fallback — never leaves emailTransporter uninitialised
      this.emailTransporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  private initMailgun() {
    const apiKey = this.config.get<string>('MAILGUN_API_KEY', '');
    const domain = this.config.get<string>('MAILGUN_DOMAIN', '');

    if (!apiKey || apiKey === 'your-mailgun-api-key') {
      this.logger.warn('⚠️  Mailgun API key not configured — SMS disabled');
      return;
    }

    try {
      const mg = new Mailgun(FormData);
      this.mailgunClient = mg.client({ username: 'api', key: apiKey });
      this.mailgunDomain = domain;
      this.mailgunFromSms = this.config.get<string>('MAILGUN_FROM_SMS', '');
      this.logger.log('✅ Mailgun client initialized');
    } catch (error: unknown) {
      this.logger.error('❌ Mailgun init failed:', toMsg(error));
      this.mailgunClient = null;
    }
  }

  private async initFirebase() {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID', '');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL', '');
    const privateKey = this.config
      .get<string>('FIREBASE_PRIVATE_KEY', '')
      .replace(/\\n/g, '\n');

    const hasValidPem =
      privateKey.includes('BEGIN PRIVATE KEY') &&
      privateKey.includes('END PRIVATE KEY');

    if (!projectId || !clientEmail || !hasValidPem) {
      this.logger.warn('⚠️  Firebase credentials incomplete — push disabled');
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
      }
      this.firebaseReady = true;
      this.logger.log('✅ Firebase initialized');
    } catch (err: unknown) {
      this.logger.warn(`⚠️  Firebase disabled: ${toMsg(err)}`);
    }
  }

  // ── EMAIL (Nodemailer) ────────────────────────────────────────────

  private async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.emailTransporter.sendMail({
        from: {
          name: this.config.get<string>('SENDGRID_FROM_NAME', 'ESUUQ'),
          address: this.config.get<string>('SMTP_FROM', 'noreply@esuuq.com'),
        },
        to,
        subject,
        html,
        text: text ?? this.stripHtml(html),
      });
      this.logger.log(`📧 Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error: unknown) {
      this.logger.error(`❌ Failed to send email to ${to}:`, toMsg(error));
    }
  }

  async sendOtpEmail(to: string, otp: string) {
    await this.sendEmail(to, `Your ESUUQ verification code: ${otp}`, this.otpEmailHtml(otp));
  }

  async sendPasswordResetOtpEmail(to: string, otp: string, expiresInMinutes = 10) {
    await this.sendEmail(
      to,
      `Your ESUUQ password reset code: ${otp}`,
      this.passwordResetEmailHtml(otp, expiresInMinutes),
    );
  }

  async sendOrderConfirmation(to: string, orderId: string, total: number, otp: string) {
    if (!this.isOrderEmailEnabled()) return;
    await this.sendEmail(
      to,
      `Order Confirmed — ${orderId}`,
      this.orderConfirmHtml(orderId, total, otp),
    );
  }

  async sendOrderStatusUpdate(to: string, orderId: string, newStatus: string) {
    if (!this.isOrderEmailEnabled()) return;
    await this.sendEmail(
      to,
      `Order ${orderId} — ${newStatus.replace(/_/g, ' ').toUpperCase()}`,
      `<p>Your order <strong>${orderId}</strong> is now <strong>${newStatus}</strong>.</p>`,
    );
  }

  // ── SMS (Mailgun) ─────────────────────────────────────────────────

  async sendOtpSms(phone: string, otp: string) {
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
    } catch (error: unknown) {
      this.logger.error(`❌ Failed to send SMS to ${phone}:`, toMsg(error));
    }
  }

  // ── PUSH (Firebase) ───────────────────────────────────────────────

  async sendPush(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!this.isPushEnabled() || !this.firebaseReady) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const admin = require('firebase-admin');
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data,
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default', badge: 1 } } },
      });
      this.logger.log('📲 Push notification sent');
    } catch (err: unknown) {
      this.logger.error('❌ Push notification failed:', toMsg(err));
    }
  }

  async sendNewOrderToDriver(driverFcmToken: string, orderId: string, earnings: number) {
    await this.sendPush(
      driverFcmToken,
      '⚡ New Delivery Order',
      `Order #${orderId} — Earn $${earnings.toFixed(2)}`,
      { orderId, type: 'new_order' },
    );
  }

  async sendNewOrderToMerchant(merchantFcmToken: string, orderId: string) {
    await this.sendPush(
      merchantFcmToken,
      '📦 New Order Received',
      `Order ${orderId} needs your attention`,
      { orderId, type: 'new_order' },
    );
  }

  // ── IN-APP NOTIFICATIONS ──────────────────────────────────────────

  async sendLowStockAlert(merchantId: string, product: { name: string; stock: number }) {
    const recipientUserId = await this.resolveNotificationRecipientUserId(merchantId);
    await this.createNotification(
      recipientUserId,
      '⚠️ Low Stock Alert',
      `Your product "${product.name}" is running low (${product.stock} left).`,
      NotificationType.SYSTEM,
    );
  }

  async sendOutOfStockAlert(merchantId: string, product: { name: string }) {
    const recipientUserId = await this.resolveNotificationRecipientUserId(merchantId);
    await this.createNotification(
      recipientUserId,
      '⛔ Out of Stock',
      `Your product "${product.name}" is now out of stock.`,
      NotificationType.SYSTEM,
    );
  }

  async createNotificationForMerchant(
    merchantId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    actionUrl?: string,
  ) {
    const recipientUserId = await this.resolveNotificationRecipientUserId(merchantId);
    return this.createNotification(recipientUserId, title, message, type, actionUrl);
  }

  async createNotificationsForRoles(
    roles: UserRole[],
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    actionUrl?: string,
  ) {
    const recipients = await this.userRepo.find({
      where: { role: In(roles), isActive: true },
      select: ['id'],
    });

    for (const recipient of recipients) {
      await this.createNotification(recipient.id, title, message, type, actionUrl);
    }

    return { sent: recipients.length };
  }

  async notifySubAdmins(
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    actionUrl?: string,
  ) {
    return this.createNotificationsForRoles(
      [UserRole.SUB_ADMIN, UserRole.ADMIN],
      title,
      message,
      type,
      actionUrl,
    );
  }

  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    actionUrl?: string,
  ) {
    const notification = this.appNotificationRepo.create({
      id: ulid(),
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
          await this.sendPush(
            user.fcmToken,
            title,
            message,
            actionUrl ? { actionUrl } : {},
          );
        }
      } catch (err: unknown) {
        this.logger.error('❌ Failed to send FCM push:', toMsg(err));
      }
    }

    return saved;
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
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

  async markAsRead(id: string, userId: string) {
    await this.appNotificationRepo.update({ id, userId }, { isRead: true });
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.appNotificationRepo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  // ── PRIVATE HELPERS ───────────────────────────────────────────────

  private async countUnread(userId: string) {
    return this.appNotificationRepo.count({ where: { userId, isRead: false } });
  }

  private async resolveNotificationRecipientUserId(
    merchantIdOrUserId: string,
  ): Promise<string> {
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantIdOrUserId },
      select: ['id', 'userId'],
    });
    return merchant?.userId ?? merchantIdOrUserId;
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isSmsEnabled(): boolean {
    return this.config.get<string>('ENABLE_SMS_NOTIFICATIONS', 'false') === 'true';
  }

  private isPushEnabled(): boolean {
    return this.config.get<string>('ENABLE_PUSH_NOTIFICATIONS', 'false') === 'true';
  }

  private isOrderEmailEnabled(): boolean {
    return this.config.get<string>('ENABLE_ORDER_EMAIL_NOTIFICATIONS', 'false') === 'true';
  }

  // ── EMAIL TEMPLATES ───────────────────────────────────────────────

  private otpEmailHtml(otp: string): string {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#0A0F1E;color:#F8FAFC;border-radius:12px;">
        <div style="font-size:2rem;font-weight:800;margin-bottom:1rem;">ES<span style="color:#00C9A7">UUQ</span></div>
        <h2 style="margin-bottom:0.5rem;">Verify Your Account</h2>
        <p style="color:#94A3B8;margin-bottom:1.5rem;">Use the code below to verify your account. It expires in 10 minutes.</p>
        <div style="background:#1E2A3A;padding:1.5rem;border-radius:8px;text-align:center;letter-spacing:0.5em;font-size:2rem;font-weight:700;color:#00C9A7;margin-bottom:1.5rem;">${otp}</div>
        <p style="color:#94A3B8;font-size:0.8rem;">If you didn't request this, you can safely ignore this email.</p>
      </div>`;
  }

  private passwordResetEmailHtml(otp: string, expiresInMinutes: number): string {
    return `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;background:#0A0F1E;color:#F8FAFC;border-radius:12px;">
        <div style="font-size:2rem;font-weight:800;margin-bottom:1rem;">ES<span style="color:#00C9A7">UUQ</span></div>
        <h2 style="margin-bottom:0.5rem;">Reset Your Password</h2>
        <p style="color:#94A3B8;margin-bottom:1.5rem;">Use the code below to reset your password. It expires in ${expiresInMinutes} minutes.</p>
        <div style="background:#1E2A3A;padding:1.5rem;border-radius:8px;text-align:center;letter-spacing:0.5em;font-size:2rem;font-weight:700;color:#00C9A7;margin-bottom:1.5rem;">${otp}</div>
        <p style="color:#94A3B8;font-size:0.8rem;">If you didn't request this reset, you can safely ignore this email.</p>
      </div>`;
  }

  private orderConfirmHtml(orderId: string, total: number, otp: string): string {
    return `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:2rem;">
        <div style="font-size:2rem;font-weight:800;margin-bottom:1rem;color:#0A0F1E;">ES<span style="color:#00C9A7">UUQ</span></div>
        <h2>Order Confirmed ✅</h2>
        <p>Your order <strong>${orderId}</strong> has been confirmed. Total: <strong>$${total.toFixed(2)}</strong></p>
        <p>Your delivery confirmation code (share with driver): <strong style="font-size:1.5rem;color:#00C9A7;">${otp}</strong></p>
        <p style="color:#666;font-size:0.8rem;">Keep this safe — you'll need it when the driver arrives.</p>
      </div>`;
  }
}