import {
  Controller, Post, Get, Body, Req, Res, UseGuards,
  HttpCode, HttpStatus, Param, BadRequestException,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody,
} from '@nestjs/swagger';
import { Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto, RegisterMerchantUserDto } from './dto/index';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../database/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // ── POST /auth/register ──────────────────────
  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'OTP sent to email and phone' })
  @ApiResponse({ status: 409, description: 'Email or phone already registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }


  // ── POST /auth/register-merchant ─────────────
  @Public()
  @Post('register-merchant')
  @ApiOperation({ summary: 'Register a new merchant user and store' })
  @ApiResponse({ status: 201, description: 'User and merchant created, OTP sent' })
  async registerMerchant(@Body() dto: RegisterMerchantUserDto) {
    return this.authService.registerMerchant(dto);
  }

  // ── POST /auth/login ─────────────────────────
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Returns access + refresh tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@CurrentUser() user: User, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(user);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return { accessToken: result.accessToken, user: result.user };
  }

  // ── POST /auth/verify-otp ────────────────────
  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP after registration' })
  async verifyOtp(@Body() dto: VerifyOtpDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyOtp(dto);
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: result.accessToken, verified: result.verified, user: result.user };
  }

  // ── POST /auth/resend-otp ────────────────────
  @Public()
  @Post('resend-otp/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP (rate-limited)' })
  async resendOtp(@Param('userId') userId: string) {
    return this.authService.resendOtp(userId);
  }

  // ── POST /auth/forgot-password ───────────────
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset OTP (always returns generic response)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  // ── POST /auth/reset-password ────────────────
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with email + OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // ── POST /auth/refresh ───────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Req() req: any, @Body() dto: RefreshTokenDto) {
    // Accept from cookie OR body
    const refreshToken = req.cookies?.refreshToken ?? dto.refreshToken;
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required (from cookie or body)');
    }
    const decoded = this.decodeRefreshToken(refreshToken);
    return this.authService.refreshTokens(decoded.sub, refreshToken);
  }

  // ── POST /auth/logout ────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout — revokes refresh token' })
  async logout(
    @CurrentUser() user: User,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    res.clearCookie('refreshToken');
    return this.authService.logout(user.id, refreshToken);
  }

  // ── GET /auth/me ─────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: User) {
    return user;
  }

  // ── Google OAuth ─────────────────────────────
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth2 login' })
  googleAuth() {
    // Redirects to Google — handled by passport
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth2 callback' })
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);

    // Set refresh token in httpOnly cookie just like normal login
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });


    const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:4000';
    res.redirect(`${clientUrl}/auth/callback?token=${result.accessToken}`);
  }

  private decodeRefreshToken(token: string): { sub: string } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('JWT must have 3 parts (header.payload.signature)');
      }
      const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      if (!decoded.sub) {
        throw new Error('Token missing "sub" claim');
      }
      return decoded;
    } catch (error) {
      throw new BadRequestException(
        `Invalid refresh token: ${error instanceof Error ? error.message : 'malformed token'}`,
      );
    }
  }
}
