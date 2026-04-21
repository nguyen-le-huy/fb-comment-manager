import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService, AuthenticatedUser } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser, AuthUser } from './decorators/get-user.decorator';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';

interface MeResponse {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Redirect to Facebook OAuth' })
  @ApiResponse({ status: 302, description: 'Redirect to Facebook' })
  facebookLogin(): void {
    // Passport handles the redirect
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with JWT token' })
  facebookCallback(@Req() req: Request, @Res() res: Response): void {
    const user = req.user as AuthenticatedUser;
    const tokenData = this.authService.issueJwt(user);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    if (!frontendUrl) {
      throw new InternalServerErrorException('FRONTEND_URL is not configured');
    }

    const params = new URLSearchParams({
      token: tokenData.accessToken,
      userId: tokenData.user.id,
      name: tokenData.user.name,
    });

    res.redirect(frontendUrl + '/auth/callback?' + params.toString());
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  logout(): { message: string } {
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns current user info' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getMe(@GetUser() user: AuthUser): MeResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    };
  }
}
