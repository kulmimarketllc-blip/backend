// users/users.controller.ts
import {
  Controller, Get, Put, Patch, Post, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User, UserRole } from '../database/entities/user.entity';
import { AddressType } from '../database/entities/supporting.entities';
import { fileUrl, multerOptions } from '../uploads/multer.config';

class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatarUrl?: string;
}

class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword: string;
  @ApiProperty() @IsString() @MinLength(8) newPassword: string;
}

class DeleteAccountDto {
  @ApiProperty() @IsString() confirmText: string;
  @ApiPropertyOptional() @IsOptional() @IsString() currentPassword?: string;
}

class CustomerSettingsDto {
  @ApiPropertyOptional({
    type: 'object',
    example: {
      'order-updates': true,
      offers: true,
      arrivals: false,
      'price-drops': true,
    },
  })
  @IsOptional()
  notifications?: Record<string, boolean>;

  @ApiPropertyOptional({
    type: 'object',
    example: {
      'two-factor': false,
      'login-alerts': true,
    },
  })
  @IsOptional()
  security?: Record<string, boolean>;
}

class AddressDto {
  @ApiPropertyOptional({ enum: AddressType, default: AddressType.HOME })
  @IsOptional() @IsEnum(AddressType) type?: AddressType;
  @ApiProperty() @IsString() fullName: string;
  @ApiPropertyOptional() @IsOptional() @IsString() email?: string;
  @ApiProperty() @IsString() phone: string;
  @ApiProperty() @IsString() addressLine1: string;
  @ApiPropertyOptional() @IsOptional() @IsString() addressLine2?: string;
  @ApiProperty() @IsString() city: string;
  @ApiProperty() @IsString() state: string;
  @ApiProperty() @IsString() zipCode: string;
  @ApiPropertyOptional() @IsOptional() @IsString() country?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Boolean) @IsBoolean() isDefault?: boolean;
}

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) { }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  getMe(@CurrentUser() user: User) { return this.usersService.findById(user.id); }

  // Modified: Supports both JSON and file upload for avatar
  @Put('me')
  @ApiOperation({ summary: 'Update profile' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        phone: { type: 'string' },
        avatar: {
          type: 'string',
          format: 'binary',
          description: 'Avatar image file (optional)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('avatar', multerOptions('avatars')))
  async updateMe(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // If file is uploaded, process it
    if (file) {
      const baseUrl = this.config.get<string>('APP_URL', 'http://localhost:3000/v1');
      const avatarUrl = fileUrl(baseUrl, 'avatars', file.filename);
      dto.avatarUrl = avatarUrl;
    }

    // Remove avatar from body if it was sent as string (to avoid confusion)
    if (dto.avatarUrl && typeof dto.avatarUrl === 'string' && !file) {
      // Keep the existing avatarUrl if provided in JSON
      // This allows updating avatarUrl directly via JSON
    }

    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password' })
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate own account' })
  deactivate(@CurrentUser() user: User) {
    return this.usersService.deactivateAccount(user.id, user.id, user.role);
  }

  @Delete('me/account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete own account with confirmation' })
  deleteOwnAccount(@CurrentUser() user: User, @Body() dto: DeleteAccountDto) {
    return this.usersService.deleteOwnAccount(user.id, dto.confirmText, dto.currentPassword);
  }

  @Get('me/settings')
  @ApiOperation({ summary: 'Get customer settings preferences' })
  getCustomerSettings(@CurrentUser() user: User) {
    return this.usersService.getCustomerSettings(user.id);
  }

  @Patch('me/settings')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update customer settings preferences' })
  updateCustomerSettings(@CurrentUser() user: User, @Body() dto: CustomerSettingsDto) {
    return this.usersService.updateCustomerSettings(user.id, dto);
  }

  @Patch('me/fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update FCM device token' })
  updateFcmToken(@CurrentUser() user: User, @Body() body: { token: string }) {
    return this.usersService.updateFcmToken(user.id, body.token);
  }

  @Get('me/addresses')
  @ApiOperation({ summary: 'List saved addresses' })
  getAddresses(@CurrentUser() user: User) { return this.usersService.getAddresses(user.id); }

  @Post('me/addresses')
  @ApiOperation({ summary: 'Add address' })
  createAddress(@CurrentUser() user: User, @Body() dto: AddressDto) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Put('me/addresses/:id')
  @ApiOperation({ summary: 'Update address' })
  updateAddress(@Param('id') id: string, @CurrentUser() user: User, @Body() dto: Partial<AddressDto>) {
    return this.usersService.updateAddress(id, user.id, dto);
  }

  @Patch('me/addresses/:id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set address as default' })
  setDefault(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.setDefaultAddress(id, user.id);
  }

  @Delete('me/addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete address' })
  deleteAddress(@Param('id') id: string, @CurrentUser() user: User) {
    return this.usersService.deleteAddress(id, user.id);
  }

  @Get('me/wishlist')
  @ApiOperation({ summary: 'Get wishlist' })
  getWishlist(@CurrentUser() user: User, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.getWishlist(user.id, +page, +limit);
  }

  @Post('me/wishlist/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle product in wishlist' })
  toggleWishlist(@Param('productId') productId: string, @CurrentUser() user: User) {
    return this.usersService.toggleWishlist(user.id, productId);
  }

  @Delete('me/wishlist')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear wishlist' })
  clearWishlist(@CurrentUser() user: User) { return this.usersService.clearWishlist(user.id); }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: list users' })
  findAll(@Query('page') page = 1, @Query('limit') limit = 20, @Query('role') role?: UserRole, @Query('search') search?: string) {
    return this.usersService.findAll(+page, +limit, role, search);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: get user by ID' })
  findOne(@Param('id') id: string) { return this.usersService.findById(id); }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin: update user role/status' })
  adminUpdate(@Param('id') id: string, @Body() body: { isActive?: boolean; isVerified?: boolean; role?: UserRole }) {
    return this.usersService.adminUpdateUser(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Admin: delete user' })
  adminDelete(@Param('id') id: string) { return this.usersService.hardDelete(id); }
}