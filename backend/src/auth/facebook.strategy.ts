import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AppConfig } from '../config/configuration';

type VerifyCallback = (error: Error | null, user?: Express.User | false) => void;

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger(FacebookStrategy.name);

  constructor(
    configService: ConfigService<AppConfig>,
    private readonly authService: AuthService,
  ) {
    const appId = configService.get<string>('FB_APP_ID');
    const appSecret = configService.get<string>('FB_APP_SECRET');
    const callbackUrl = configService.get<string>('FB_CALLBACK_URL');

    if (!appId || !appSecret || !callbackUrl) {
      throw new Error('Facebook OAuth configuration is missing');
    }

    super({
      clientID: appId,
      clientSecret: appSecret,
      callbackURL: callbackUrl,
      scope: ['email', 'pages_show_list', 'pages_read_engagement', 'pages_manage_engagement'],
      profileFields: ['id', 'displayName', 'photos', 'email'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    this.logger.log('Facebook OAuth callback for user: ' + profile.id);
    try {
      const user = await this.authService.validateFacebookUser(profile, accessToken);
      done(null, user);
    } catch (error) {
      this.logger.error('Facebook OAuth validation failed', (error as Error).stack);
      done(error as Error);
    }
  }
}
