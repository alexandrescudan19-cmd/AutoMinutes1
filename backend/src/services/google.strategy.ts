import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || 'google-client-id-not-configured',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google-client-secret-not-configured',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3500/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    // Normalizeaza profilul primit Google. acum.
    const { name, emails } = profile;
    const user = {
      email: emails?.[0]?.value ?? '',
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      refreshToken,
    };
    done(null, user);
  }
}
