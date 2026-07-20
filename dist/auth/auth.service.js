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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("../database/entities/user.entity");
const notifications_service_1 = require("../notifications/notifications.service");
const merchants_service_1 = require("../merchants/merchants.service");
const notification_entity_1 = require("../database/entities/notification.entity");
const admin = __importStar(require("firebase-admin"));
let AuthService = AuthService_1 = class AuthService {
    constructor(usersRepo, jwtService, config, notifications, merchantsService, cache) {
        this.usersRepo = usersRepo;
        this.jwtService = jwtService;
        this.config = config;
        this.notifications = notifications;
        this.merchantsService = merchantsService;
        this.cache = cache;
        this.logger = new common_1.Logger(AuthService_1.name);
        this.BCRYPT_ROUNDS = 12;
        this.OTP_PREFIX = 'otp:';
        this.RESET_PASSWORD_OTP_PREFIX = 'pwd-reset:otp:';
        this.BLACKLIST_PREFIX = 'blacklist:refresh:';
    }
    async register(dto) {
        const existing = await this.usersRepo.findOne({
            where: [{ email: dto.email }, { phone: dto.phone }],
        });
        if (existing) {
            throw new common_1.ConflictException(existing.email === dto.email
                ? 'Email already registered'
                : 'Phone number already registered');
        }
        const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
        const user = this.usersRepo.create({
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            role: dto.role ?? user_entity_1.UserRole.CUSTOMER,
            provider: user_entity_1.AuthProvider.LOCAL,
            isVerified: false,
        });
        await this.usersRepo.save(user);
        await this.sendOtp(user.id, user.email, user.phone);
        this.logger.log(`New user registered: ${user.email} [${user.role}]`);
        return { message: 'OTP sent to email and phone', userId: user.id };
    }
    async registerMerchant(dto) {
        const existing = await this.usersRepo.findOne({
            where: [{ email: dto.email }, { phone: dto.phone }],
        });
        if (existing) {
            throw new common_1.ConflictException(existing.email === dto.email
                ? 'Email already registered'
                : 'Phone number already registered');
        }
        const passwordHash = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
        const user = this.usersRepo.create({
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            role: user_entity_1.UserRole.MERCHANT,
            provider: user_entity_1.AuthProvider.LOCAL,
            isVerified: false,
        });
        const savedUser = await this.usersRepo.save(user);
        const merchant = await this.merchantsService.register(savedUser.id, {
            storeName: dto.storeName,
            description: dto.storeDescription,
            businessInfo: {
                ...dto.businessInfo,
                category: dto.category,
                returnPolicy: dto.returnPolicy,
            },
        });
        await this.sendOtp(savedUser.id, savedUser.email, savedUser.phone);
        await this.notifications.notifySubAdmins('🆕 New Merchant Application', `A new merchant store "${dto.storeName}" has registered and is awaiting approval.`, notification_entity_1.NotificationType.SYSTEM, `/subadmin/merchant-approvals`);
        this.logger.log(`New merchant registered: ${savedUser.email} (Store: ${dto.storeName})`);
        return { message: 'Merchant registered. Please verify your account with the OTP sent.', userId: savedUser.id };
    }
    async validateUser(email, password) {
        const user = await this.usersRepo.findOne({
            where: { email },
            select: ['id', 'email', 'passwordHash', 'role', 'isVerified', 'isActive', 'firstName', 'lastName'],
        });
        if (!user || !user.passwordHash) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.isActive) {
            throw new common_1.UnauthorizedException('Account deactivated');
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid credentials');
        return user;
    }
    async login(user) {
        if (!user.isVerified) {
            await this.sendOtp(user.id, user.email, user.phone);
            throw new common_1.UnauthorizedException({
                message: 'Account not verified. New OTP sent.',
                requiresOtp: true,
                userId: user.id,
                email: user.email,
            });
        }
        const tokens = await this.generateTokens(user);
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
    async verifyOtp(dto) {
        const key = `${this.OTP_PREFIX}${dto.userId}`;
        const storedOtp = await this.cache.get(key);
        if (!storedOtp)
            throw new common_1.BadRequestException('OTP expired or not found');
        const valid = await bcrypt.compare(dto.otp, storedOtp);
        if (!valid)
            throw new common_1.BadRequestException('Invalid OTP');
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
    async resendOtp(userId) {
        const user = await this.usersRepo.findOneByOrFail({ id: userId });
        if (user.isVerified)
            throw new common_1.BadRequestException('Already verified');
        await this.sendOtp(user.id, user.email, user.phone);
        return { message: 'OTP resent' };
    }
    async requestPasswordReset(email) {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const genericResponse = {
            message: 'If an account exists with this email, a password reset code has been sent.',
        };
        if (!normalizedEmail) {
            return genericResponse;
        }
        const user = await this.usersRepo.findOne({
            where: { email: normalizedEmail },
            select: ['id', 'email', 'isActive', 'passwordHash', 'provider'],
        });
        if (!user || !user.isActive || !user.passwordHash || user.provider !== user_entity_1.AuthProvider.LOCAL) {
            return genericResponse;
        }
        const otp = this.generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        const ttlMs = this.getPasswordResetOtpTtlMs();
        await this.cache.set(`${this.RESET_PASSWORD_OTP_PREFIX}${user.id}`, otpHash, ttlMs);
        await this.notifications.sendPasswordResetOtpEmail(user.email, otp, Math.round(ttlMs / 60000));
        this.logger.log(`Password reset OTP issued for ${user.email}`);
        return genericResponse;
    }
    async resendOtpByEmail(email) {
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const genericResponse = {
            message: 'If an unverified account exists with this email, a new OTP has been sent.',
        };
        if (!normalizedEmail) {
            return genericResponse;
        }
        const user = await this.usersRepo.findOne({
            where: { email: normalizedEmail },
            select: ['id', 'email', 'phone', 'isVerified', 'provider'],
        });
        if (!user || user.isVerified || user.provider !== user_entity_1.AuthProvider.LOCAL) {
            return genericResponse;
        }
        const rateLimitKey = `otp:resend:${user.id}`;
        const recentlySent = await this.cache.get(rateLimitKey);
        if (recentlySent) {
            throw new common_1.BadRequestException('Please wait 60 seconds before requesting another OTP');
        }
        await this.sendOtp(user.id, user.email, user.phone);
        await this.cache.set(rateLimitKey, '1', 60 * 1000);
        this.logger.log(`Registration OTP resent for ${user.email}`);
        return { message: 'OTP resent to your email and phone' };
    }
    async resetPassword(dto) {
        const normalizedEmail = String(dto.email || '').trim().toLowerCase();
        const user = await this.usersRepo.findOne({
            where: { email: normalizedEmail },
            select: ['id', 'email', 'passwordHash', 'isActive', 'provider'],
        });
        if (!user || !user.passwordHash || !user.isActive || user.provider !== user_entity_1.AuthProvider.LOCAL) {
            throw new common_1.BadRequestException('Invalid or expired reset code');
        }
        const key = `${this.RESET_PASSWORD_OTP_PREFIX}${user.id}`;
        const storedOtp = await this.cache.get(key);
        if (!storedOtp) {
            throw new common_1.BadRequestException('Invalid or expired reset code');
        }
        const validOtp = await bcrypt.compare(dto.otp, storedOtp);
        if (!validOtp) {
            throw new common_1.BadRequestException('Invalid or expired reset code');
        }
        const isSamePassword = await bcrypt.compare(dto.newPassword, user.passwordHash);
        if (isSamePassword) {
            throw new common_1.BadRequestException('New password must differ from the current password');
        }
        await this.usersRepo.update(user.id, {
            passwordHash: await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS),
            refreshTokenHash: undefined,
        });
        await this.cache.del(key);
        this.logger.log(`Password reset completed for ${user.email}`);
        return { message: 'Password has been reset successfully' };
    }
    async refreshTokens(userId, refreshToken) {
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: ['id', 'email', 'role', 'refreshTokenHash', 'isActive'],
        });
        if (!user?.refreshTokenHash || !user.isActive) {
            throw new common_1.UnauthorizedException('Access denied');
        }
        const isBlacklisted = await this.cache.get(`${this.BLACKLIST_PREFIX}${refreshToken}`);
        if (isBlacklisted)
            throw new common_1.UnauthorizedException('Token revoked');
        const valid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Invalid refresh token');
        const tokens = await this.generateTokens(user);
        const newRefreshHash = await bcrypt.hash(tokens.refreshToken, 10);
        await this.usersRepo.update(userId, { refreshTokenHash: newRefreshHash });
        return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }
    async logout(userId, refreshToken) {
        if (refreshToken) {
            const ttl = 7 * 24 * 60 * 60 * 1000;
            await this.cache.set(`${this.BLACKLIST_PREFIX}${refreshToken}`, '1', ttl);
        }
        await this.usersRepo.update(userId, { refreshTokenHash: undefined });
        return { message: 'Logged out successfully' };
    }
    async googleLogin(profile) {
        let user = await this.usersRepo.findOne({
            where: [{ email: profile.email }, { providerId: profile.id }],
        });
        if (!user) {
            user = this.usersRepo.create({
                email: profile.email,
                firstName: profile.firstName,
                lastName: profile.lastName,
                avatarUrl: profile.avatarUrl,
                provider: user_entity_1.AuthProvider.GOOGLE,
                providerId: profile.id,
                role: user_entity_1.UserRole.CUSTOMER,
                isVerified: true,
                isActive: true,
            });
            await this.usersRepo.save(user);
            this.logger.log(`Google OAuth new user: ${user.email}`);
        }
        return this.login(user);
    }
    async generateTokens(user) {
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
    async sendOtp(userId, email, phone) {
        const otp = this.generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        const ttl = this.config.get('OTP_TTL_SECONDS', 600) * 1000;
        await this.cache.set(`${this.OTP_PREFIX}${userId}`, otpHash, ttl);
        await Promise.allSettled([
            this.notifications.sendOtpEmail(email, otp),
            phone ? this.notifications.sendOtpSms(phone, otp) : Promise.resolve(),
        ]);
    }
    getPasswordResetOtpTtlMs() {
        const ttlSeconds = this.config.get('RESET_PASSWORD_OTP_TTL_SECONDS', this.config.get('OTP_TTL_SECONDS', 600));
        return Math.max(60, Number(ttlSeconds || 600)) * 1000;
    }
    generateOtp() {
        const len = this.config.get('OTP_LENGTH', 6);
        return Math.floor(Math.random() * Math.pow(10, len))
            .toString()
            .padStart(len, '0');
    }
    sanitizeUser(user) {
        const { passwordHash, refreshTokenHash, ...safe } = user;
        return safe;
    }
    async loginWithGoogleFirebase(idToken) {
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        }
        catch (err) {
            this.logger.warn(`Firebase token verification failed: ${err instanceof Error ? err.message : err}`);
            throw new common_1.UnauthorizedException('Invalid or expired Google token');
        }
        const { uid, email, name, picture } = decodedToken;
        if (!email) {
            throw new common_1.BadRequestException('Google account has no email associated with it');
        }
        const [firstName, ...rest] = (name ?? '').trim().split(' ').filter(Boolean);
        return this.googleLogin({
            id: uid,
            email,
            firstName: firstName || 'Google',
            lastName: rest.join(' ') || 'User',
            avatarUrl: picture,
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(5, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        jwt_1.JwtService,
        config_1.ConfigService,
        notifications_service_1.NotificationsService,
        merchants_service_1.MerchantsService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map