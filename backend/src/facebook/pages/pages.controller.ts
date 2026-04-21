import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser, AuthUser } from '../../auth/decorators/get-user.decorator';
import {
  ManagedFacebookPage,
  PageWebhookResubscribeResult,
  PageWebhookStatus,
  PagesService,
} from './pages.service';

@ApiTags('facebook/pages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facebook/pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get managed Facebook pages for current user' })
  @ApiResponse({ status: 200, description: 'Returns managed Facebook pages' })
  getPages(@GetUser() user: AuthUser): Promise<ManagedFacebookPage[]> {
    return this.pagesService.getManagedPages(user.id);
  }

  @Get('webhook-status')
  @ApiOperation({ summary: 'Check webhook subscription status of managed pages' })
  @ApiResponse({ status: 200, description: 'Returns webhook subscription status per page' })
  getWebhookStatus(@GetUser() user: AuthUser): Promise<PageWebhookStatus[]> {
    return this.pagesService.getWebhookStatus(user.id);
  }

  @Post('webhook-resubscribe')
  @ApiOperation({ summary: 'Re-subscribe app webhook for all managed pages' })
  @ApiResponse({ status: 201, description: 'Returns re-subscribe result per page' })
  resubscribeWebhook(@GetUser() user: AuthUser): Promise<PageWebhookResubscribeResult[]> {
    return this.pagesService.resubscribeWebhooks(user.id);
  }
}
