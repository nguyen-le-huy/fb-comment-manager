import { InternalServerErrorException, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Profile } from 'passport-facebook';
import { User, UserDocument } from '../schemas/user.schema';
import { FacebookPage, FacebookPageDocument } from '../schemas/facebook-page.schema';
import { FacebookPageInfo, GraphApiService } from '../facebook/graph-api.service';
import { JwtPayload } from './jwt.strategy';

interface UserProjection {
  _id: Types.ObjectId;
  facebookId: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface AuthenticatedUser {
  id: string;
  facebookId: string;
  name: string;
  email?: string;
  avatar?: string;
}

export interface AuthTokenResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(FacebookPage.name)
    private readonly pageModel: Model<FacebookPageDocument>,
    private readonly jwtService: JwtService,
    private readonly graphApiService: GraphApiService,
  ) {}

  async validateFacebookUser(
    profile: Profile,
    userAccessToken: string,
  ): Promise<AuthenticatedUser> {
    this.logger.log('Upserting user: ' + profile.id);

    const user = await this.userModel
      .findOneAndUpdate(
        { facebookId: profile.id },
        {
          $set: {
            facebookId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            avatar: profile.photos?.[0]?.value,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .select('_id facebookId name email avatar')
      .lean<UserProjection | null>();

    if (!user) {
      throw new InternalServerErrorException('Could not upsert authenticated user');
    }

    const userId = user._id.toString();
    await this.syncUserPages(userId, userAccessToken);

    return {
      id: userId,
      facebookId: user.facebookId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };
  }

  private async syncUserPages(userId: string, userAccessToken: string): Promise<void> {
    const pages = await this.graphApiService.getManagedPages(userAccessToken);

    for (const page of pages) {
      await this.upsertManagedPage(userId, page);
    }

    this.logger.log('Synced ' + pages.length + ' pages for user ' + userId);
  }

  private async upsertManagedPage(userId: string, page: FacebookPageInfo): Promise<void> {
    await this.pageModel
      .findOneAndUpdate(
        { pageId: page.id },
        {
          $set: {
            userId,
            pageId: page.id,
            pageName: page.name,
            pageAccessToken: page.access_token,
            category: page.category,
            pageAvatar:
              page.picture?.data?.url ??
              `https://graph.facebook.com/${page.id}/picture?type=small`,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .select('_id')
      .lean();
  }

  issueJwt(user: AuthenticatedUser): AuthTokenResponse {
    const payload: JwtPayload = { sub: user.id, facebookId: user.facebookId };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
