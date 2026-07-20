import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole, AuthProvider } from '../database/entities/user.entity';
import { Address, Wishlist } from '../database/entities/supporting.entities';
import { Product } from '../database/entities/product.entity';
import { UpdateProfileDto } from './users.controller';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  private readonly defaultCustomerSettings = {
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

  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Address) private readonly addressesRepo: Repository<Address>,
    @InjectRepository(Wishlist) private readonly wishlistRepo: Repository<Wishlist>,
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
  ) { }

  // ── Profile ───────────────────────────────────
  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      select: ['id', 'firstName', 'lastName', 'email', 'phone', 'role',
        'avatarUrl', 'customerSettings', 'isVerified', 'isActive', 'provider', 'createdAt', 'lastLoginAt'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private normalizeCustomerSettings(settings?: any) {
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

  async getCustomerSettings(userId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'customerSettings'],
    });
    if (!user) throw new NotFoundException('User not found');

    const normalized = this.normalizeCustomerSettings(user.customerSettings);

    if (!user.customerSettings) {
      await this.usersRepo.update(userId, { customerSettings: normalized });
    }

    return normalized;
  }

  async updateCustomerSettings(userId: string, settings: any) {
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

  async updateFcmToken(userId: string, token: string) {
    await this.usersRepo.update(userId, { fcmToken: token });
    return { success: true };
  }


  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // Email change
    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('Email is already in use');
      }

      user.email = dto.email.toLowerCase().trim();
      user.isVerified = false; // optional but recommended — force re-verification
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    return this.usersRepo.save(user);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersRepo.findOne({ where: { id }, select: ['id', 'passwordHash', 'provider'] });
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) throw new BadRequestException('Cannot change password on social login accounts');
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');
    if (currentPassword === newPassword) throw new BadRequestException('New password must differ');
    await this.usersRepo.update(id, { passwordHash: await bcrypt.hash(newPassword, 12) });
    this.logger.log(`Password changed: ${id}`);
  }

  async updateAvatar(id: string, avatarUrl: string): Promise<User> {
    await this.usersRepo.update(id, { avatarUrl });
    return this.findById(id);
  }

  async deactivateAccount(id: string, requesterId: string, role: UserRole): Promise<void> {
    if (id !== requesterId && role !== UserRole.ADMIN) {
      throw new ForbiddenException();
    }
    await this.usersRepo.update(id, { isActive: false });
  }

  async deleteOwnAccount(userId: string, confirmText: string, currentPassword?: string): Promise<void> {
    const normalizedConfirm = String(confirmText || '').trim().toUpperCase();
    if (normalizedConfirm !== 'DELETE') {
      throw new BadRequestException('Type DELETE to confirm account deletion');
    }

    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: ['id', 'email', 'role', 'isActive', 'provider', 'passwordHash'],
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('Admin account cannot be deleted from this endpoint');
    }

    if (user.provider === AuthProvider.LOCAL) {
      if (!currentPassword) {
        throw new BadRequestException('Current password is required to delete your account');
      }
      if (!user.passwordHash) {
        throw new BadRequestException('Password validation is unavailable for this account');
      }
      const validPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!validPassword) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    const anonymizedEmail = `deleted+${user.id}@deleted.local`;

    await this.usersRepo.manager.transaction(async (manager) => {
      await manager.update(User, userId, {
        firstName: 'Deleted',
        lastName: 'User',
        email: anonymizedEmail,
        phone: null as any,
        avatarUrl: null as any,
        isVerified: false,
        isActive: false,
        providerId: null as any,
        passwordHash: null as any,
        refreshTokenHash: null as any,
        lastLoginAt: null as any,
      } as any);

      await manager.softDelete(Address, { userId });
      await manager.delete(Wishlist, { userId });
      await manager.softDelete(User, { id: userId });
    });

    this.logger.warn(`User deleted own account: ${userId}`);
  }

  // ── Addresses ─────────────────────────────────
  async getAddresses(userId: string): Promise<Address[]> {
    return this.addressesRepo.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async createAddress(userId: string, dto: any): Promise<Address> {
    const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase();

    const existingAddresses = await this.addressesRepo.find({ where: { userId } });

    // Prevent duplicate address rows by reusing an existing one with matching core fields.
    const duplicate = existingAddresses.find((address) => (
      normalize(address.fullName) === normalize(dto.fullName)
      && normalize(address.phone) === normalize(dto.phone)
      && normalize(address.addressLine1) === normalize(dto.addressLine1)
      && normalize(address.addressLine2) === normalize(dto.addressLine2)
      && normalize(address.city) === normalize(dto.city)
      && normalize(address.state) === normalize(dto.state)
      && normalize(address.zipCode) === normalize(dto.zipCode)
      && normalize(address.country || 'United States') === normalize(dto.country || 'United States')
    ));

    if (duplicate) {
      const duplicateUpdates: Partial<Address> = {};
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
        if (!updated) throw new NotFoundException('Address not found');
        return updated;
      }

      return duplicate;
    }

    const count = existingAddresses.length;
    if (count >= 10) throw new BadRequestException('Maximum of 10 addresses allowed');
    if (dto.isDefault || count === 0) {
      await this.addressesRepo.update({ userId }, { isDefault: false });
    }
    const entity = Object.assign(new Address(), {
      ...dto,
      userId,
      isDefault: dto.isDefault || count === 0,
    });
    return this.addressesRepo.save(entity);
  }

  async updateAddress(id: string, userId: string, dto: any): Promise<Address> {
    const address = await this.addressesRepo.findOne({ where: { id } });
    if (!address) throw new NotFoundException('Address not found');
    if (address.userId !== userId) throw new ForbiddenException();
    if (dto.isDefault && !address.isDefault) {
      await this.addressesRepo.update({ userId }, { isDefault: false });
    }
    return this.addressesRepo.save(Object.assign(address, dto));
  }

  async setDefaultAddress(id: string, userId: string): Promise<Address> {
    const address = await this.addressesRepo.findOne({ where: { id } });
    if (!address) throw new NotFoundException();
    if (address.userId !== userId) throw new ForbiddenException();
    await this.addressesRepo.update({ userId }, { isDefault: false });
    await this.addressesRepo.update(id, { isDefault: true });
    const updated = await this.addressesRepo.findOneBy({ id });
    if (!updated) throw new NotFoundException('Address not found');
    return updated;
  }

  async deleteAddress(id: string, userId: string): Promise<void> {
    const address = await this.addressesRepo.findOne({ where: { id } });
    if (!address) throw new NotFoundException();
    if (address.userId !== userId) throw new ForbiddenException();
    if (address.isDefault) throw new BadRequestException('Cannot delete default address. Set another as default first.');
    await this.addressesRepo.softDelete(id);
  }

  // ── Wishlist ──────────────────────────────────
  async getWishlist(userId: string, page = 1, limit = 20) {
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

  async toggleWishlist(userId: string, productId: string): Promise<{ wishlisted: boolean }> {
    const product = await this.productsRepo.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('Product not found');
    const existing = await this.wishlistRepo.findOne({ where: { userId, productId } });
    if (existing) {
      await this.wishlistRepo.delete({ userId, productId });
      return { wishlisted: false };
    }
    await this.wishlistRepo.save(this.wishlistRepo.create({ userId, productId }));
    return { wishlisted: true };
  }

  async clearWishlist(userId: string): Promise<void> {
    await this.wishlistRepo.delete({ userId });
  }

  // ── Admin ─────────────────────────────────────
  async findAll(page = 1, limit = 20, role?: UserRole, search?: string) {
    const qb = this.usersRepo.createQueryBuilder('u')
      .select(['u.id', 'u.firstName', 'u.lastName', 'u.email', 'u.phone',
        'u.role', 'u.isActive', 'u.isVerified', 'u.createdAt', 'u.lastLoginAt'])
      .where('u.deleted_at IS NULL');
    if (role) qb.andWhere('u.role = :role', { role });
    if (search) qb.andWhere(
      '(LOWER(u.email) LIKE LOWER(:s) OR LOWER(u.firstName) LIKE LOWER(:s))',
      { s: `%${search}%` },
    );
    qb.orderBy('u.createdAt', 'DESC').skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async adminUpdateUser(id: string, updates: { isActive?: boolean; isVerified?: boolean; role?: UserRole }): Promise<User> {
    await this.usersRepo.update(id, updates);
    return this.findById(id);
  }

  async hardDelete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (user.role === UserRole.ADMIN) throw new ForbiddenException('Cannot delete admin');
    await this.usersRepo.softDelete(id);
  }
}
