import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { JwtStrategy } from '../services/jwt.strategy';
import { UsersModule } from './users.module';
import { CryptoModule } from './crypto.module';
import { MailService } from '@services/mail.service';
import { GoogleStrategy } from '@services/google.strategy';
import { GoogleConnectGuard } from '../guards/google-connect.guard';
import { GoogleOAuthConfigGuard } from '../guards/google-oauth-config.guard';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    CryptoModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'change-me-in-env',
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    MailService,
    GoogleStrategy,
    GoogleConnectGuard,
    GoogleOAuthConfigGuard,
  ],
})
export class AuthModule {}
