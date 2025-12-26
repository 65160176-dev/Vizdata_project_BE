import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('FACEBOOK_APP_ID') || '',
      clientSecret: configService.get<string>('FACEBOOK_APP_SECRET') || '',
      callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') || '',
      profileFields: ['id', 'emails', 'name', 'displayName', 'photos'],
      scope: ['email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: Function,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;
    
    const user = {
      facebookId: id,
      email: emails && emails.length > 0 ? emails[0].value : null,
      firstName: name?.givenName,
      lastName: name?.familyName,
      displayName: profile.displayName,
      picture: photos && photos.length > 0 ? photos[0].value : null,
      provider: 'facebook',
    };
    
    done(null, user);
  }
}
