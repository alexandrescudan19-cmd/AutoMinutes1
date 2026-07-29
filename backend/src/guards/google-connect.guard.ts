import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export const GOOGLE_CONNECT_PURPOSE = 'google-connect';

const GOOGLE_CONNECT_SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/meetings.space.readonly',
];

@Injectable()
export class GoogleConnectGuard extends AuthGuard('google') {
  constructor(private readonly jwtService: JwtService) {
    super();
  }

  async getAuthenticateOptions(context: ExecutionContext) {
    // Pregateste conectarea Google protejata. acum.
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.query.token;

    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Missing authentication token.');
    }

    const payload = await this.jwtService.verifyAsync<{ sub: string }>(token);

    const state = await this.jwtService.signAsync(
      { sub: payload.sub, purpose: GOOGLE_CONNECT_PURPOSE },
      { expiresIn: '5m' },
    );

    return {
      scope: GOOGLE_CONNECT_SCOPES,
      accessType: 'offline',
      prompt: 'consent',
      state,
    };
  }
}
