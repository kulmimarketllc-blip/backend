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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("../database/entities/user.entity");
const supporting_entities_1 = require("../database/entities/supporting.entities");
const product_entity_1 = require("../database/entities/product.entity");
let UsersService = UsersService_1 = class UsersService {
    constructor(usersRepo, addressesRepo, wishlistRepo, productsRepo) {
        this.usersRepo = usersRepo;
        this.addressesRepo = addressesRepo;
        this.wishlistRepo = wishlistRepo;
        this.productsRepo = productsRepo;
        this.logger = new common_1.Logger(UsersService_1.name);
        this.defaultCustomerSettings = {
            notifications: {
                'order-updates': true,
                offers: true,
                arrivals: false,
                'price-drops': true,
            },
            security: {
                'two-factor': false,
                'login-alerts': true,
            },
        };
    }
    async findById(id) {
        const user = await this.usersRepo.findOne({
            where: { id },
            select: ['id', 'firstName', 'lastName', 'email', 'phone', 'role',
                'avatarUrl', 'customerSettings', 'isVerified', 'isActive', 'provider', 'createdAt', 'lastLoginAt'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        return user;
    }
    normalizeCustomerSettings(settings) {
        return {
            notifications: {
                ...this.defaultCustomerSettings.notifications,
                ...(settings?.notifications || {}),
            },
            security: {
                ...this.defaultCustomerSettings.security,
                ...(settings?.security || {}),
            },
        };
    }
    async getCustomerSettings(userId) {
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: ['id', 'customerSettings'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const normalized = this.normalizeCustomerSettings(user.customerSettings);
        if (!user.customerSettings) {
            await this.usersRepo.update(userId, { customerSettings: normalized });
        }
        return normalized;
    }
    async updateCustomerSettings(userId, settings) {
        const current = await this.getCustomerSettings(userId);
        const merged = this.normalizeCustomerSettings({
            notifications: {
                ...current.notifications,
                ...(settings?.notifications || {}),
            },
            security: {
                ...current.security,
                ...(settings?.security || {}),
            },
        });
        await this.usersRepo.update(userId, { customerSettings: merged });
        return merged;
    }
    async updateFcmToken(userId, token) {
        await this.usersRepo.update(userId, { fcmToken: token });
        return { success: true };
    }
    async updateProfile(userId, dto) {
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: [
                'id', 'firstName', 'lastName', 'email', 'phone',
                'avatarUrl', 'passwordHash', 'provider', 'isVerified',
            ],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (dto.email !== undefined) {
            const normalizedEmail = dto.email.toLowerCase().trim();
            if (normalizedEmail !== user.email) {
                const existing = await this.usersRepo.findOne({
                    where: { email: normalizedEmail },
                });
                if (existing && existing.id !== userId) {
                    throw new common_1.ConflictException('Email is already in use');
                }
                user.email = normalizedEmail;
                user.isVerified = false;
            }
        }
        if (dto.phone !== undefined) {
            const normalizedPhone = dto.phone.trim();
            if (normalizedPhone && normalizedPhone !== user.phone) {
                const existing = await this.usersRepo.findOne({
                    where: { phone: normalizedPhone },
                });
                if (existing && existing.id !== userId) {
                    throw new common_1.ConflictException('Phone number is already in use');
                }
                user.phone = normalizedPhone;
            }
            else if (!normalizedPhone) {
                user.phone = null;
            }
        }
        if (dto.firstName !== undefined)
            user.firstName = dto.firstName.trim();
        if (dto.lastName !== undefined)
            user.lastName = dto.lastName.trim();
        if (dto.avatarUrl !== undefined)
            user.avatarUrl = dto.avatarUrl;
        const wantsPasswordChange = dto.currentPassword || dto.newPassword;
        if (wantsPasswordChange) {
            if (user.provider !== user_entity_1.AuthProvider.LOCAL) {
                throw new common_1.BadRequestException('Cannot change password on social login accounts');
            }
            if (!dto.currentPassword || !dto.newPassword) {
                throw new common_1.BadRequestException('Both currentPassword and newPassword are required');
            }
            if (!user.passwordHash) {
                throw new common_1.BadRequestException('Password validation is unavailable for this account');
            }
            const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
            if (!valid) {
                throw new common_1.BadRequestException('Current password is incorrect');
            }
            if (dto.currentPassword === dto.newPassword) {
                throw new common_1.BadRequestException('New password must differ from current password');
            }
            user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
            this.logger.log(`Password changed via profile update: ${userId}`);
        }
        const saved = await this.usersRepo.save(user);
        return this.findById(saved.id);
    }
    async changePassword(id, currentPassword, newPassword) {
        const user = await this.usersRepo.findOne({ where: { id }, select: ['id', 'passwordHash', 'provider'] });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (!user.passwordHash)
            throw new common_1.BadRequestException('Cannot change password on social login accounts');
        const valid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!valid)
            throw new common_1.BadRequestException('Current password is incorrect');
        if (currentPassword === newPassword)
            throw new common_1.BadRequestException('New password must differ');
        await this.usersRepo.update(id, { passwordHash: await bcrypt.hash(newPassword, 12) });
        this.logger.log(`Password changed: ${id}`);
    }
    async updateAvatar(id, avatarUrl) {
        await this.usersRepo.update(id, { avatarUrl });
        return this.findById(id);
    }
    async deactivateAccount(id, requesterId, role) {
        if (id !== requesterId && role !== user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException();
        }
        await this.usersRepo.update(id, { isActive: false });
    }
    async deleteOwnAccount(userId, confirmText, currentPassword) {
        const normalizedConfirm = String(confirmText || '').trim().toUpperCase();
        if (normalizedConfirm !== 'DELETE') {
            throw new common_1.BadRequestException('Type DELETE to confirm account deletion');
        }
        const user = await this.usersRepo.findOne({
            where: { id: userId },
            select: ['id', 'email', 'role', 'isActive', 'provider', 'passwordHash'],
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (user.role === user_entity_1.UserRole.ADMIN) {
            throw new common_1.ForbiddenException('Admin account cannot be deleted from this endpoint');
        }
        if (user.provider === user_entity_1.AuthProvider.LOCAL) {
            if (!currentPassword) {
                throw new common_1.BadRequestException('Current password is required to delete your account');
            }
            if (!user.passwordHash) {
                throw new common_1.BadRequestException('Password validation is unavailable for this account');
            }
            const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
            if (!validPassword) {
                throw new common_1.BadRequestException('Current password is incorrect');
            }
        }
        const anonymizedEmail = `deleted+${user.id}@deleted.local`;
        await this.usersRepo.manager.transaction(async (manager) => {
            await manager.update(user_entity_1.User, userId, {
                firstName: 'Deleted',
                lastName: 'User',
                email: anonymizedEmail,
                phone: null,
                avatarUrl: null,
                isVerified: false,
                isActive: false,
                providerId: null,
                passwordHash: null,
                refreshTokenHash: null,
                lastLoginAt: null,
            });
            await manager.softDelete(supporting_entities_1.Address, { userId });
            await manager.delete(supporting_entities_1.Wishlist, { userId });
            await manager.softDelete(user_entity_1.User, { id: userId });
        });
        this.logger.warn(`User deleted own account: ${userId}`);
    }
    async getAddresses(userId) {
        return this.addressesRepo.find({
            where: { userId },
            order: { isDefault: 'DESC', createdAt: 'DESC' },
        });
    }
    async createAddress(userId, dto) {
        const normalize = (value) => String(value ?? '').trim().toLowerCase();
        const existingAddresses = await this.addressesRepo.find({ where: { userId } });
        const duplicate = existingAddresses.find((address) => (normalize(address.fullName) === normalize(dto.fullName)
            && normalize(address.phone) === normalize(dto.phone)
            && normalize(address.addressLine1) === normalize(dto.addressLine1)
            && normalize(address.addressLine2) === normalize(dto.addressLine2)
            && normalize(address.city) === normalize(dto.city)
            && normalize(address.state) === normalize(dto.state)
            && normalize(address.zipCode) === normalize(dto.zipCode)
            && normalize(address.country || 'United States') === normalize(dto.country || 'United States')));
        if (duplicate) {
            const duplicateUpdates = {};
            const incomingEmail = String(dto.email ?? '').trim();
            if (incomingEmail && incomingEmail !== (duplicate.email || '')) {
                duplicateUpdates.email = incomingEmail;
            }
            if (dto.isDefault && !duplicate.isDefault) {
                await this.addressesRepo.update({ userId }, { isDefault: false });
                duplicateUpdates.isDefault = true;
            }
            if (Object.keys(duplicateUpdates).length > 0) {
                await this.addressesRepo.update(duplicate.id, duplicateUpdates);
                const updated = await this.addressesRepo.findOneBy({ id: duplicate.id });
                if (!updated)
                    throw new common_1.NotFoundException('Address not found');
                return updated;
            }
            return duplicate;
        }
        const count = existingAddresses.length;
        if (count >= 10)
            throw new common_1.BadRequestException('Maximum of 10 addresses allowed');
        if (dto.isDefault || count === 0) {
            await this.addressesRepo.update({ userId }, { isDefault: false });
        }
        const entity = Object.assign(new supporting_entities_1.Address(), {
            ...dto,
            userId,
            isDefault: dto.isDefault || count === 0,
        });
        return this.addressesRepo.save(entity);
    }
    async updateAddress(id, userId, dto) {
        const address = await this.addressesRepo.findOne({ where: { id } });
        if (!address)
            throw new common_1.NotFoundException('Address not found');
        if (address.userId !== userId)
            throw new common_1.ForbiddenException();
        if (dto.isDefault && !address.isDefault) {
            await this.addressesRepo.update({ userId }, { isDefault: false });
        }
        return this.addressesRepo.save(Object.assign(address, dto));
    }
    async setDefaultAddress(id, userId) {
        const address = await this.addressesRepo.findOne({ where: { id } });
        if (!address)
            throw new common_1.NotFoundException();
        if (address.userId !== userId)
            throw new common_1.ForbiddenException();
        await this.addressesRepo.update({ userId }, { isDefault: false });
        await this.addressesRepo.update(id, { isDefault: true });
        const updated = await this.addressesRepo.findOneBy({ id });
        if (!updated)
            throw new common_1.NotFoundException('Address not found');
        return updated;
    }
    async deleteAddress(id, userId) {
        const address = await this.addressesRepo.findOne({ where: { id } });
        if (!address)
            throw new common_1.NotFoundException();
        if (address.userId !== userId)
            throw new common_1.ForbiddenException();
        if (address.isDefault)
            throw new common_1.BadRequestException('Cannot delete default address. Set another as default first.');
        await this.addressesRepo.softDelete(id);
    }
    async getWishlist(userId, page = 1, limit = 20) {
        const [data, total] = await this.wishlistRepo.findAndCount({
            where: { userId },
            relations: ['product', 'product.merchant', 'product.category'],
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return {
            data: data.map((w) => w.product),
            meta: { total, page, limit, pages: Math.ceil(total / limit) },
        };
    }
    async toggleWishlist(userId, productId) {
        const product = await this.productsRepo.findOneBy({ id: productId });
        if (!product)
            throw new common_1.NotFoundException('Product not found');
        const existing = await this.wishlistRepo.findOne({ where: { userId, productId } });
        if (existing) {
            await this.wishlistRepo.delete({ userId, productId });
            return { wishlisted: false };
        }
        await this.wishlistRepo.save(this.wishlistRepo.create({ userId, productId }));
        return { wishlisted: true };
    }
    async clearWishlist(userId) {
        await this.wishlistRepo.delete({ userId });
    }
    async findAll(page = 1, limit = 20, role, search) {
        const qb = this.usersRepo.createQueryBuilder('u')
            .select(['u.id', 'u.firstName', 'u.lastName', 'u.email', 'u.phone',
            'u.role', 'u.isActive', 'u.isVerified', 'u.createdAt', 'u.lastLoginAt'])
            .where('u.deleted_at IS NULL');
        if (role)
            qb.andWhere('u.role = :role', { role });
        if (search)
            qb.andWhere('(LOWER(u.email) LIKE LOWER(:s) OR LOWER(u.firstName) LIKE LOWER(:s))', { s: `%${search}%` });
        qb.orderBy('u.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
        const [data, total] = await qb.getManyAndCount();
        return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
    }
    async adminUpdateUser(id, updates) {
        await this.usersRepo.update(id, updates);
        return this.findById(id);
    }
    async hardDelete(id) {
        const user = await this.findById(id);
        if (user.role === user_entity_1.UserRole.ADMIN)
            throw new common_1.ForbiddenException('Cannot delete admin');
        await this.usersRepo.softDelete(id);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(supporting_entities_1.Address)),
    __param(2, (0, typeorm_1.InjectRepository)(supporting_entities_1.Wishlist)),
    __param(3, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map