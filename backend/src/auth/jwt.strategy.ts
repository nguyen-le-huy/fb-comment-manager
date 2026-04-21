import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { AppConfig } from '../config/configuration';
import { AuthUser } from './decorators/get-user.decorator';

export interface JwtPayload {
  sub: string;
  facebookId: string;
}

interface JwtUserProjection {
  _id: Types.ObjectId;
  facebookId: string;
  name: string;
  email?: string;
  avatar?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService<AppConfig>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    this.logger.log('JWT validate for user: ' + payload.sub);

    const user = await this.userModel
      .findById(payload.sub)
      .select('_id facebookId name email avatar')
      .lean<JwtUserProjection | null>();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user._id.toString(),
      facebookId: user.facebookId,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };
  }
}
