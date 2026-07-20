import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { User } from '../database/entities/user.entity';
import { RegisterDto, RegisterMerchantUserDto } from './dto/index';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { MerchantsService } from '../merchants/merchants.service';
export declare class AuthService {
    private readonly usersRepo;
    private readonly jwtService;
    private readonly config;
    private readonly notifications;
    private readonly merchantsService;
    private readonly cache;
    private readonly logger;
    private readonly BCRYPT_ROUNDS;
    private readonly OTP_PREFIX;
    private readonly RESET_PASSWORD_OTP_PREFIX;
    private readonly BLACKLIST_PREFIX;
    constructor(usersRepo: Repository<User>, jwtService: JwtService, config: ConfigService, notifications: NotificationsService, merchantsService: MerchantsService, cache: Cache);
    register(dto: RegisterDto): Promise<{
        message: string;
        userId: string;
    }>;
    registerMerchant(dto: RegisterMerchantUserDto): Promise<{
        message: string;
        userId: string;
    }>;
    validateUser(email: string, password: string): Promise<User>;
    login(user: User): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        verified: boolean;
        user: any;
        accessToken: string;
        refreshToken: string;
    }>;
    resendOtp(userId: string): Promise<{
        message: string;
    }>;
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    resendOtpByEmail(email: string): Promise<{
        message: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    refreshTokens(userId: string, refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, refreshToken?: string): Promise<{
        message: string;
    }>;
    googleLogin(profile: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
    private generateTokens;
    private sendOtp;
    private getPasswordResetOtpTtlMs;
    private generateOtp;
    private sanitizeUser;
    loginWithGoogleFirebase(idToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: any;
    }>;
}
