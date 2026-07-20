import { UserRole } from '../../database/entities/user.entity';
export declare class RegisterDto {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    password: string;
    role?: UserRole;
}
export declare class RegisterMerchantUserDto extends RegisterDto {
    storeName: string;
    storeDescription?: string;
    category?: string;
    returnPolicy?: string;
    businessInfo?: any;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class ResendOtpDto {
    email: string;
}
export declare class VerifyOtpDto {
    userId: string;
    otp: string;
}
export declare class RefreshTokenDto {
    refreshToken?: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    email: string;
    otp: string;
    newPassword: string;
}
