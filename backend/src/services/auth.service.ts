import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../repositories/users.repository';
import { RegisterDto } from '../dto/auth/register.dto';
import { LoginDto } from '../dto/auth/login.dto';
import { ForgotPasswordDto } from '@dto/auth/forgot-password.dto';
import { ResetPasswordDto } from '@dto/auth/reset-password.dto';
import { User } from '../models/user.schema';
import { randomBytes } from 'crypto';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto): Promise<Omit<User, 'passwordHash' | 'verificationToken'>> {
    if (!dto.email?.includes('@')) {
      throw new BadRequestException('Invalid email address');
    }
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }

    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationToken = randomBytes(32).toString('hex');

    const user = await this.usersRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      email: dto.email,
      passwordHash,
      isVerified: false,
      verificationToken,
    });

    await this.mailService.sendVerificationEmail(user.email, verificationToken);

    return this.sanitize(user);
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; user: Omit<User, 'passwordHash' | 'verificationToken'> }> {
    const user = await this.usersRepository.findByEmail(dto.email ?? '');
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordOk = await bcrypt.compare(dto.password ?? '', user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return { accessToken, user: this.sanitize(user) };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    if (!token) {
      throw new BadRequestException('Verification token is missing');
    }

    const user = await this.usersRepository.findByVerificationToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.usersRepository.update(user.id, {
      isVerified: true,
      verificationToken: null,
    });

    return { message: 'Email verified successfully. You can sign in.' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const genericResponse = {
      message: 'A password reset link has been sent!',
    };

    if (!dto.email?.includes('@')) {
      return genericResponse;
    }

    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      return genericResponse;
    }

    const resetPasswordToken = randomBytes(32).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // valabilitate o ora

    await this.usersRepository.update(user.id, {
      resetPasswordToken,
      resetPasswordExpires,
    });

    await this.mailService.sendPasswordResetEmail(user.email, resetPasswordToken);

    return genericResponse;
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    if (!dto.token) {
      throw new BadRequestException('Reset token is missing');
    }
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const user = await this.usersRepository.findByResetToken(dto.token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.usersRepository.update(user.id, {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    return { message: 'Your password has been reset succesfully.' };
  }

  async loginWithGoogle(googleUser: {
    email: string;
    firstName: string;
    lastName: string;
  }): Promise<{ accessToken: string }> {
    if (!googleUser.email) {
      throw new UnauthorizedException('Google account has no email');
    }

    let user = await this.usersRepository.findByEmail(googleUser.email);

    if (!user) {
      const randomPassword = randomBytes(32).toString('hex');
      const passwordHash = await bcrypt.hash(randomPassword, 10);

      user = await this.usersRepository.create({
        firstName: googleUser.firstName || 'Google',
        lastName: googleUser.lastName || 'User',
        email: googleUser.email,
        passwordHash,
        isVerified: true,
        verificationToken: null,
      });
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    return { accessToken };
  }

  private sanitize(user: User): Omit<User, 'passwordHash' | 'verificationToken'> {
    const { passwordHash, verificationToken, ...rest } = user;
    return rest;
  }
}
