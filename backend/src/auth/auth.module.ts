import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FacebookStrategy } from './facebook.strategy';
import { JwtStrategy } from './jwt.strategy';
import { User, UserSchema } from '../schemas/user.schema';
import { FacebookPage, FacebookPageSchema } from '../schemas/facebook-page.schema';
import { GraphApiService } from '../facebook/graph-api.service';
import { AppConfig } from '../config/configuration';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN');

        if (!secret || !expiresIn) {
          throw new Error('JWT configuration is missing');
        }

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: FacebookPage.name, schema: FacebookPageSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, FacebookStrategy, JwtStrategy, GraphApiService],
  exports: [JwtModule],
})
export class AuthModule {}
