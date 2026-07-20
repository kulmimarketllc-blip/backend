import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { User, UserRole } from '../database/entities/user.entity';
import { AddressType } from '../database/entities/supporting.entities';
export declare class UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    avatarUrl?: string;
}
declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
declare class DeleteAccountDto {
    confirmText: string;
    currentPassword?: string;
}
declare class CustomerSettingsDto {
    notifications?: Record<string, boolean>;
    security?: Record<string, boolean>;
}
declare class AddressDto {
    type?: AddressType;
    fullName: string;
    email?: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    isDefault?: boolean;
}
export declare class UsersController {
    private readonly usersService;
    private readonly config;
    constructor(usersService: UsersService, config: ConfigService);
    getMe(user: User): Promise<User>;
    updateMe(user: User, dto: UpdateProfileDto, file?: Express.Multer.File): Promise<User>;
    changePassword(user: User, dto: ChangePasswordDto): Promise<void>;
    deactivate(user: User): Promise<void>;
    deleteOwnAccount(user: User, dto: DeleteAccountDto): Promise<void>;
    getCustomerSettings(user: User): Promise<{
        notifications: any;
        security: any;
    }>;
    updateCustomerSettings(user: User, dto: CustomerSettingsDto): Promise<{
        notifications: any;
        security: any;
    }>;
    updateFcmToken(user: User, body: {
        token: string;
    }): Promise<{
        success: boolean;
    }>;
    getAddresses(user: User): Promise<import("../database/entities/supporting.entities").Address[]>;
    createAddress(user: User, dto: AddressDto): Promise<import("../database/entities/supporting.entities").Address>;
    updateAddress(id: string, user: User, dto: Partial<AddressDto>): Promise<import("../database/entities/supporting.entities").Address>;
    setDefault(id: string, user: User): Promise<import("../database/entities/supporting.entities").Address>;
    deleteAddress(id: string, user: User): Promise<void>;
    getWishlist(user: User, page?: number, limit?: number): Promise<{
        data: import("../database/entities/product.entity").Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    toggleWishlist(productId: string, user: User): Promise<{
        wishlisted: boolean;
    }>;
    clearWishlist(user: User): Promise<void>;
    findAll(page?: number, limit?: number, role?: UserRole, search?: string): Promise<{
        data: User[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    findOne(id: string): Promise<User>;
    adminUpdate(id: string, body: {
        isActive?: boolean;
        isVerified?: boolean;
        role?: UserRole;
    }): Promise<User>;
    adminDelete(id: string): Promise<void>;
}
export {};
