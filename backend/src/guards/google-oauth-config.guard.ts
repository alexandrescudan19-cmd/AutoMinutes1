import { CanActivate, Injectable, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class GoogleOAuthConfigGuard implements CanActivate {
  canActivate(): boolean {
    const isConfigured = Boolean(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CALLBACK_URL,
    );

    if (!isConfigured) {
      throw new ServiceUnavailableException(
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_CALLBACK_URL.',
      );
    }

    return true;
  }
}
