import {
  Injectable, UnauthorizedException, ConflictException,
  BadRequestException, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';

import { User, UserRole, AuthProvider } from '../database/entities/user.entity';
import { OtpType, RegisterDto, RegisterMerchantUserDto } from './dto/index';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { MerchantsService } from '../merchants/merchants.service';
import { NotificationType } from '../database/entities/notification.entity';
import * as admin from 'firebase-admin';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly OTP_PREFIX = 'otp:';
  private readonly RESET_PASSWORD_OTP_PREFIX = 'pwd-reset:otp:';
  private readonly BLACKLIST_PREFIX = 'blacklist:refresh:';

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,

    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly merchantsService: MerchantsService,

    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) { }

  private normalizeEmail(email: string): string {
    return String(email || '').trim().toLowerCase();
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;

    return this.usersRepo
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();
  }

  private async checkRateLimit(key: string, seconds = 60): Promise<void> {
    const blocked = await this.cache.get(key);
    if (blocked) {
      throw new BadRequestException(`Please wait ${seconds} seconds before requesting another OTP`);
    }
    await this.cache.set(key, '1', seconds * 1000);
  }

  // ── Register ──────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email
          ? 'Email already registered'
          : 'Phone number already registered',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = this.usersRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: (dto.role as UserRole) ?? UserRole.CUSTOMER,
      provider: AuthProvider.LOCAL,
      isVerified: false,
    });

    await this.usersRepo.save(user);

    // Generate and send OTP
    await this.sendOtp(user.id, user.email, user.phone);

    this.logger.log(`New user registered: ${user.email} [${user.role}]`);
    return {
      message: 'OTP sent to email and phone',
      userId: user.id,
      email: user.email,
      type: OtpType.REGISTER,
    };
  }

  // ── Register Merchant ─────────────────────────
  async registerMerchant(dto: RegisterMerchantUserDto) {
    // 1. Create User
    const existing = await this.usersRepo.findOne({
      where: [{ email: dto.email }, { phone: dto.phone }],
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email
          ? 'Email already registered'
          : 'Phone number already registered',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    const user = this.usersRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      passwordHash,
      role: UserRole.MERCHANT,
      provider: AuthProvider.LOCAL,
      isVerified: false,
    });

    const savedUser = await this.usersRepo.save(user);

    // 2. Create Merchant Store
    const merchant = await this.merchantsService.register(savedUser.id, {
      storeName: dto.storeName,
      description: dto.storeDescription,
      businessInfo: {
        ...dto.businessInfo,
        category: dto.category,
        returnPolicy: dto.returnPolicy,
      },
    });

    // 3. Generate and send OTP
    await this.sendOtp(savedUser.id, savedUser.email, savedUser.phone);

    // 4. Notify Subadmins
    await this.notifications.notifySubAdmins(
      '🆕 New Merchant Application',
      `A new merchant store "${dto.storeName}" has registered and is awaiting approval.`,
      NotificationType.SYSTEM,
      `/subadmin/merchant-approvals`
    );

    this.logger.log(`New merchant registered: ${savedUser.email} (Store: ${dto.storeName})`);
    return {
      message: 'Merchant registered. Please verify your account with the OTP sent.',
      userId: savedUser.id,
      email: savedUser.email,
      type: OtpType.REGISTER,
    };
  }

  // ── Validate local credentials ────────────────
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { email },
      select: ['id', 'email', 'passwordHash', 'role', 'isVerified', 'isActive', 'firstName', 'lastName'],
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account deactivated');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  // ── Login ─────────────────────────────────────
  async login(user: User) {
    if (!user.isVerified) {
      // Resend OTP and ask them to verify
      await this.sendOtp(user.id, user.email, user.phone);
      throw new UnauthorizedException({
        message: 'Account not verified. New OTP sent.',
        requiresOtp: true,
        userId: user.id,
        email: user.email,
        type: OtpType.REGISTER,
      });
    }

    const tokens = await this.generateTokens(user);

    // Store hashed refresh token
    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersRepo.update(user.id, {
      refreshTokenHash: refreshHash,
      lastLoginAt: new Date(),
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  // ── Verify OTP ────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto) {
    const key = `${this.OTP_PREFIX}${dto.userId}`;
    const storedOtp = await this.cache.get<string>(key);

    if (!storedOtp) throw new BadRequestException('OTP expired or not found');

    const valid = await bcrypt.compare(dto.otp, storedOtp);
    if (!valid) throw new BadRequestException('Invalid OTP');

    // Mark verified and delete OTP
    await this.usersRepo.update(dto.userId, { isVerified: true });
    await this.cache.del(key);

    const user = await this.usersRepo.findOneByOrFail({ id: dto.userId });
    const tokens = await this.generateTokens(user);

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersRepo.update(user.id, {
      refreshTokenHash: refreshHash,
      lastLoginAt: new Date(),
    });

    this.logger.log(`User verified: ${user.email}`);
    return { ...tokens, verified: true, user: this.sanitizeUser(user) };
  }

  // ── Resend OTP (register OR reset password) ───
  async resendOtp(email: string, type?: OtpType) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) {
      throw new BadRequestException('Email is required');
    }

    const user = await this.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new BadRequestException('No account found with this email');
    }

    // Auto-detect when type is not sent:
    // unverified user → registration OTP, verified user → password reset OTP
    const effectiveType = type ?? (user.isVerified ? OtpType.RESET_PASSWORD : OtpType.REGISTER);

    if (type === OtpType.REGISTER && user.isVerified) {
      throw new BadRequestException(
        'Account is already verified. Use type "reset_password" for password reset OTP.',
      );
    }

    if (type === OtpType.RESET_PASSWORD && !user.isVerified) {
      throw new BadRequestException(
        'Account is not verified yet. Use type "register" for verification OTP.',
      );
    }

    if (effectiveType === OtpType.REGISTER) {
      return this.resendRegistrationOtp(user);
    }

    return this.resendPasswordResetOtp(user);
  }

  private async resendRegistrationOtp(user: User) {
    if (user.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException('This account uses social login.');
    }

    await this.checkRateLimit(`otp:resend:register:${user.id}`);
    await this.sendOtp(user.id, user.email, user.phone);

    this.logger.log(`Registration OTP resent for ${user.email}`);
    return {
      message: 'Verification OTP resent to your email and phone',
      userId: user.id,
      email: user.email,
      type: OtpType.REGISTER,
    };
  }

  private async resendPasswordResetOtp(user: User) {
    if (!user.isActive) {
      throw new BadRequestException('Account is deactivated');
    }

    if (!user.passwordHash || user.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException('Password reset is not available for this account');
    }

    await this.checkRateLimit(`otp:resend:reset:${user.id}`);
    await this.issuePasswordResetOtp(user);

    this.logger.log(`Password reset OTP resent for ${user.email}`);
    return {
      message: 'Password reset OTP resent to your email',
      email: user.email,
      type: OtpType.RESET_PASSWORD,
    };
  }

  // ── Forgot / Reset Password ──────────────────
  async requestPasswordReset(email: string) {
    const normalizedEmail = this.normalizeEmail(email);
    const response = {
      message: 'If an account exists with this email, a password reset code has been sent.',
      email: normalizedEmail,
      type: OtpType.RESET_PASSWORD,
    };

    if (!normalizedEmail) {
      return response;
    }

    const user = await this.findUserByEmail(normalizedEmail);

    if (!user || !user.isActive || !user.passwordHash || user.provider !== AuthProvider.LOCAL) {
      return response;
    }

    try {
      await this.checkRateLimit(`otp:resend:reset:${user.id}`);
    } catch {
      throw new BadRequestException('Please wait 60 seconds before requesting another code');
    }

    await this.issuePasswordResetOtp(user);
    this.logger.log(`Password reset OTP issued for ${user.email}`);

    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const normalizedEmail = this.normalizeEmail(dto.email);
    const user = await this.findUserByEmail(normalizedEmail);

    if (!user || !user.passwordHash || !user.isActive || user.provider !== AuthProvider.LOCAL) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const key = `${this.RESET_PASSWORD_OTP_PREFIX}${user.id}`;
    const storedOtp = await this.cache.get<string>(key);
    if (!storedOtp) {
      throw new BadRequestException({
        message: 'Reset code expired or not found. Please resend OTP.',
        code: 'RESET_OTP_EXPIRED',
        canResend: true,
        type: OtpType.RESET_PASSWORD,
      });
    }

    const validOtp = await bcrypt.compare(dto.otp, storedOtp);
    if (!validOtp) {
      throw new BadRequestException('Invalid reset code');
    }

    const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSamePassword) {
      throw new BadRequestException('New password must differ from the current password');
    }

    await this.usersRepo.update(user.id, {
      passwordHash: await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS),
      refreshTokenHash: undefined,
    });

    await this.cache.del(key);
    this.logger.log(`Password reset completed for ${user.email}`);
    return { message: 'Password has been reset successfully' };
  }

  // ── Refresh Token ─────────────────────────────
  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role', 'refreshTokenHash', 'isActive'],
    });

    if (!user?.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Access denied');
    }

    // Check blacklist
    const isBlacklisted = await this.cache.get(`${this.BLACKLIST_PREFIX}${refreshToken}`);
    if (isBlacklisted) throw new UnauthorizedException('Token revoked');

    const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(user);
    const newRefreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    await this.usersRepo.update(userId, { refreshTokenHash: newRefreshHash });

    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  // ── Logout ────────────────────────────────────
  async logout(userId: string, refreshToken?: string) {
    // Blacklist refresh token in Redis (TTL = refresh token expiry)
    if (refreshToken) {
      const ttl = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
      await this.cache.set(`${this.BLACKLIST_PREFIX}${refreshToken}`, '1', ttl);
    }
    await this.usersRepo.update(userId, { refreshTokenHash: undefined });
    return { message: 'Logged out successfully' };
  }

  // ── Google OAuth ──────────────────────────────
  // ── Google OAuth ──────────────────────────────
  async googleLogin(profile: {
    id: string; email: string; firstName: string;
    lastName: string; avatarUrl?: string;
  }) {
    let user = await this.usersRepo.findOne({
      where: [{ email: profile.email }, { providerId: profile.id }],
    });

    if (!user) {
      user = this.usersRepo.create({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl,
        provider: AuthProvider.GOOGLE,
        providerId: profile.id,
        role: UserRole.CUSTOMER,
        isVerified: true,
        isActive: true,
      });
      await this.usersRepo.save(user);
      this.logger.log(`Google OAuth new user: ${user.email}`);
    }

    return this.login(user);
  }

  // ── Private Helpers ───────────────────────────
  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async sendOtp(userId: string, email: string, phone?: string) {
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const ttl = this.config.get<number>('OTP_TTL_SECONDS', 600) * 1000;

    await this.cache.set(`${this.OTP_PREFIX}${userId}`, otpHash, ttl);

    const [emailResult, smsResult] = await Promise.allSettled([
      this.notifications.sendOtpEmail(email, otp),
      phone ? this.notifications.sendOtpSms(phone, otp) : Promise.resolve(),
    ]);

    if (emailResult.status === 'rejected') {
      this.logger.error(`Failed to send OTP email to ${email}: ${emailResult.reason}`);
    }
    if (smsResult.status === 'rejected') {
      this.logger.error(`Failed to send OTP SMS to ${phone}: ${smsResult.reason}`);
    }
  }

  private async issuePasswordResetOtp(user: User) {
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const ttlMs = this.getPasswordResetOtpTtlMs();

    await this.cache.set(`${this.RESET_PASSWORD_OTP_PREFIX}${user.id}`, otpHash, ttlMs);
    await this.notifications.sendPasswordResetOtpEmail(
      user.email,
      otp,
      Math.round(ttlMs / 60000),
    );
  }

  private getPasswordResetOtpTtlMs(): number {
    const ttlSeconds = this.config.get<number>(
      'RESET_PASSWORD_OTP_TTL_SECONDS',
      this.config.get<number>('OTP_TTL_SECONDS', 600),
    );
    return Math.max(60, Number(ttlSeconds || 600)) * 1000;
  }

  private generateOtp(): string {
    const len = this.config.get<number>('OTP_LENGTH', 6);
    return Math.floor(Math.random() * Math.pow(10, len))
      .toString()
      .padStart(len, '0');
  }

  private sanitizeUser(user: User) {
    const { passwordHash, refreshTokenHash, ...safe } = user as any;
    return safe;
  }


  // ── Firebase Google Login ─────────────────────
  async loginWithGoogleFirebase(idToken: string) {
    let decodedToken: admin.auth.DecodedIdToken;

    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      this.logger.warn(`Firebase token verification failed: ${err instanceof Error ? err.message : err}`);
      throw new UnauthorizedException('Invalid or expired Google token');
    }

    const { uid, email, name, picture } = decodedToken;

    if (!email) {
      throw new BadRequestException('Google account has no email associated with it');
    }

    const [firstName, ...rest] = (name ?? '').trim().split(' ').filter(Boolean);

    // Reuses your existing googleLogin logic: finds-or-creates the user,
    // marks them verified, and issues your app's own access/refresh tokens.
    return this.googleLogin({
      id: uid,
      email,
      firstName: firstName || 'Google',
      lastName: rest.join(' ') || 'User',
      avatarUrl: picture,
    });
  }
}
