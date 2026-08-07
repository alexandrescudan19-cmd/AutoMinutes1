import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '@services/auth.service';
import { RegisterDto } from '@dto/auth/register.dto';
import { LoginDto } from '@dto/auth/login.dto';
import { ForgotPasswordDto } from '@dto/auth/forgot-password.dto';
import { ResetPasswordDto } from '@dto/auth/reset-password.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { GoogleConnectGuard, GOOGLE_CONNECT_PURPOSE } from '../guards/google-connect.guard';
import { GoogleAuthExceptionFilter } from '../filters/google-auth-exception.filter';
import { GoogleOAuthConfigGuard } from '../guards/google-oauth-config.guard';

interface GoogleAuthRequest {
  user: {
    email: string;
    firstName: string;
    lastName: string;
    refreshToken?: string;
  };
}

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    // Porneste crearea unui cont. acum.
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    // Porneste autentificarea cu parola. acum.
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    // Cere email pentru resetare. acum.
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    // Aplica parola noua primita. acum.
    return this.authService.resetPassword(dto);
  }

  @Get('verify')
  verify(@Query('token') token: string) {
    // Verifica emailul prin token. acum.
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ForgotPasswordDto) {
    return this.authService.resendVerificationEmail(dto);
  }

  @Get('google')
  @UseGuards(GoogleOAuthConfigGuard, AuthGuard('google'))
  googleLogin() {}

  @Get('google/connect')
  @UseGuards(GoogleOAuthConfigGuard, GoogleConnectGuard)
  googleConnect() {}

  @Get('google/callback')
  @UseGuards(GoogleOAuthConfigGuard, AuthGuard('google'))
  @UseFilters(GoogleAuthExceptionFilter)
  async googleCallback(
    @Req() req: GoogleAuthRequest,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.getFrontendUrl();

    if (state) {
      try {
        const payload = await this.jwtService.verifyAsync<{ sub: string; purpose: string }>(state);
        if (payload.purpose !== GOOGLE_CONNECT_PURPOSE) {
          return res.redirect(`${frontendUrl}/settings?googleConnectError=1`);
        }

        await this.authService.connectGoogleAccount(payload.sub, req.user.refreshToken);
        return res.redirect(`${frontendUrl}/settings?googleConnected=1`);
      } catch {
        return res.redirect(`${frontendUrl}/settings?googleConnectError=1`);
      }
    }

    const { accessToken } = await this.authService.loginWithGoogle(req.user);
    res.redirect(`${frontendUrl}/oauth-callback?token=${accessToken}`);
  }

  @Get('google/status')
  @UseGuards(AuthGuard('jwt'))
  googleStatus(@Req() req: AuthenticatedRequest) {
    // Returneaza statusul Google conectat. acum.
    return this.authService.getGoogleConnectionStatus(req.user.userId);
  }

  @Post('google/disconnect')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  googleDisconnect(@Req() req: AuthenticatedRequest) {
    // Deconecteaza contul Google curent. acum.
    return this.authService.disconnectGoogleAccount(req.user.userId);
  }

  private getFrontendUrl(): string {
    return (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
  }
}
