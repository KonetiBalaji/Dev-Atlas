// DevAtlas GitHub Strategy
// Created by Balaji Koneti

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly _configService: ConfigService) {
    super({
      clientID: _configService.get<string>('GITHUB_OAUTH_CLIENT_ID'),
      clientSecret: _configService.get<string>('GITHUB_OAUTH_CLIENT_SECRET'),
      callbackURL: _configService.get<string>('GITHUB_OAUTH_CALLBACK_URL'),
    });
  }

  async validate(accessToken: string, _refreshToken: string, profile: any) {
    return {
      id: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName || profile.username,
      login: profile.username,
      avatar: profile.photos?.[0]?.value,
      accessToken,
    };
  }
}
