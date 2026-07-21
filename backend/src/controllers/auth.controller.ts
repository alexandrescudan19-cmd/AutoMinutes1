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
  UseGuards,
} from '@nestjs/common';
import { AuthService } from '@services/auth.service';
import { RegisterDto } from '@dto/auth/register.dto';
import { LoginDto } from '@dto/auth/login.dto';
import { ForgotPasswordDto } from '@dto/auth/forgot-password.dto';
import { ResetPasswordDto } from '@dto/auth/reset-password.dto';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

interface GoogleAuthRequest {
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('verify')
  verify(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: GoogleAuthRequest, @Res() res: Response) {
    const { accessToken } = await this.authService.loginWithGoogle(req.user);
    res.redirect(`${process.env.FRONTEND_URL}/oauth-callback?token=${accessToken}`);
  }
}
