import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FacebookPage, FacebookPageDocument } from '../../schemas/facebook-page.schema';
import { GraphApiService } from '../graph-api.service';

interface FacebookPageProjection {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  category?: string;
  pageAvatar?: string;
}

export interface ManagedFacebookPage {
  pageId: string;
  pageName: string;
  category?: string;
  pageAvatar?: string;
}

export interface PageWebhookStatus {
  pageId: string;
  pageName: string;
  subscribed: boolean;
  subscribedApps: string[];
}

export interface PageWebhookResubscribeResult {
  pageId: string;
  pageName: string;
  success: boolean;
}

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(
    @InjectModel(FacebookPage.name)
    private readonly pageModel: Model<FacebookPageDocument>,
    private readonly graphApiService: GraphApiService,
  ) {}

  async getManagedPages(userId: string): Promise<ManagedFacebookPage[]> {
    this.logger.log('Getting managed pages for user ' + userId);

    const pages = await this.pageModel
      .find({ userId })
      .select('pageId pageName pageAccessToken category pageAvatar')
      .lean<FacebookPageProjection[]>();

    return pages.map((page) => ({
      pageId: page.pageId,
      pageName: page.pageName,
      category: page.category,
      pageAvatar:
        page.pageAvatar ??
        `https://graph.facebook.com/${page.pageId}/picture?type=small`,
    }));
  }

  async getWebhookStatus(userId: string): Promise<PageWebhookStatus[]> {
    this.logger.log('Checking webhook subscription status for user ' + userId);

    const pages = await this.pageModel
      .find({ userId })
      .select('pageId pageName pageAccessToken')
      .lean<FacebookPageProjection[]>();

    const statuses = await Promise.all(
      pages.map(async (page): Promise<PageWebhookStatus> => {
        const subscribedApps = await this.graphApiService.getSubscribedApps(
          page.pageId,
          page.pageAccessToken,
        );

        return {
          pageId: page.pageId,
          pageName: page.pageName,
          subscribed: subscribedApps.length > 0,
          subscribedApps: subscribedApps.map((app) => app.name ?? app.id),
        };
      }),
    );

    return statuses;
  }

  async resubscribeWebhooks(userId: string): Promise<PageWebhookResubscribeResult[]> {
    this.logger.log('Re-subscribing webhooks for all managed pages of user ' + userId);

    const pages = await this.pageModel
      .find({ userId })
      .select('pageId pageName pageAccessToken')
      .lean<FacebookPageProjection[]>();

    const results = await Promise.all(
      pages.map(async (page): Promise<PageWebhookResubscribeResult> => {
        const success = await this.graphApiService.subscribeAppToPage(
          page.pageId,
          page.pageAccessToken,
        );

        return {
          pageId: page.pageId,
          pageName: page.pageName,
          success,
        };
      }),
    );

    return results;
  }
}
