import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import { AppConfig } from '../config/configuration';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService<AppConfig>,
  ) {}

  @Get('facebook')
  @ApiOperation({ summary: 'Facebook webhook verification challenge' })
  @ApiQuery({ name: 'hub.mode', required: true })
  @ApiQuery({ name: 'hub.verify_token', required: true })
  @ApiQuery({ name: 'hub.challenge', required: true })
  @ApiResponse({ status: 200, description: 'Returns challenge string if token matches' })
  @ApiResponse({ status: 403, description: 'Invalid verify token' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const expectedToken = this.configService.get<string>('FB_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && verifyToken === expectedToken) {
      this.logger.log('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      this.logger.warn('Webhook verification failed');
      throw new ForbiddenException('Invalid verify token');
    }
  }

  @Post('facebook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive Facebook webhook events' })
  @ApiResponse({ status: 200, description: 'Event received and queued for processing' })
  receiveWebhook(@Body() payload: Record<string, unknown>): { status: string } {
    this.logger.log('Received Facebook webhook event');
    void this.webhookService.handleFacebookEvent(
      payload as unknown as Parameters<typeof this.webhookService.handleFacebookEvent>[0],
    );
    return { status: 'ok' };
  }
}
