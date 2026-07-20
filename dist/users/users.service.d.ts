import { Repository } from 'typeorm';
import { User, UserRole } from '../database/entities/user.entity';
import { Address, Wishlist } from '../database/entities/supporting.entities';
import { Product } from '../database/entities/product.entity';
import { UpdateProfileDto } from './users.controller';
export declare class UsersService {
    private readonly usersRepo;
    private readonly addressesRepo;
    private readonly wishlistRepo;
    private readonly productsRepo;
    private readonly logger;
    private readonly defaultCustomerSettings;
    constructor(usersRepo: Repository<User>, addressesRepo: Repository<Address>, wishlistRepo: Repository<Wishlist>, productsRepo: Repository<Product>);
    findById(id: string): Promise<User>;
    private normalizeCustomerSettings;
    getCustomerSettings(userId: string): Promise<{
        notifications: any;
        security: any;
    }>;
    updateCustomerSettings(userId: string, settings: any): Promise<{
        notifications: any;
        security: any;
    }>;
    updateFcmToken(userId: string, token: string): Promise<{
        success: boolean;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<User>;
    changePassword(id: string, currentPassword: string, newPassword: string): Promise<void>;
    updateAvatar(id: string, avatarUrl: string): Promise<User>;
    deactivateAccount(id: string, requesterId: string, role: UserRole): Promise<void>;
    deleteOwnAccount(userId: string, confirmText: string, currentPassword?: string): Promise<void>;
    getAddresses(userId: string): Promise<Address[]>;
    createAddress(userId: string, dto: any): Promise<Address>;
    updateAddress(id: string, userId: string, dto: any): Promise<Address>;
    setDefaultAddress(id: string, userId: string): Promise<Address>;
    deleteAddress(id: string, userId: string): Promise<void>;
    getWishlist(userId: string, page?: number, limit?: number): Promise<{
        data: Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    toggleWishlist(userId: string, productId: string): Promise<{
        wishlisted: boolean;
    }>;
    clearWishlist(userId: string): Promise<void>;
    findAll(page?: number, limit?: number, role?: UserRole, search?: string): Promise<{
        data: User[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        };
    }>;
    adminUpdateUser(id: string, updates: {
        isActive?: boolean;
        isVerified?: boolean;
        role?: UserRole;
    }): Promise<User>;
    hardDelete(id: string): Promise<void>;
}
