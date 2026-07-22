import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterMerchantUserDto, ResendOtpDto } from './dto/index';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../database/entities/user.entity';
import { GoogleLoginDto } from './dto/google-login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        message: string;
        userId: string;
        email: string;
        type: import("./dto/index").OtpType;
    }>;
    registerMerchant(dto: RegisterMerchantUserDto): Promise<{
        message: string;
        userId: string;
        email: string;
        type: import("./dto/index").OtpType;
    }>;
    login(user: User, res: Response): Promise<{
        accessToken: string;
        user: any;
    }>;
    googleFirebaseLogin(dto: GoogleLoginDto, res: Response): Promise<{
        accessToken: string;
        user: any;
    }>;
    verifyOtp(dto: VerifyOtpDto, res: Response): Promise<{
        accessToken: string;
        verified: boolean;
        user: any;
    }>;
    resendOtp(dto: ResendOtpDto): Promise<{
        message: string;
        email: string;
        type: import("./dto/index").OtpType;
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        email: string;
        type: import("./dto/index").OtpType;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    refresh(req: any, dto: RefreshTokenDto): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(user: User, req: any, res: Response): Promise<{
        message: string;
    }>;
    me(user: User): Promise<User>;
    googleAuth(): void;
    googleCallback(req: any, res: Response): Promise<void>;
    private decodeRefreshToken;
}
