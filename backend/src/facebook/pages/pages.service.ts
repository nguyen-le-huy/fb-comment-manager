import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FacebookPage, FacebookPageDocument } from '../../schemas/facebook-page.schema';

interface FacebookPageProjection {
  pageId: string;
  pageName: string;
  category?: string;
  pageAvatar?: string;
}

export interface ManagedFacebookPage {
  pageId: string;
  pageName: string;
  category?: string;
  pageAvatar?: string;
}

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(
    @InjectModel(FacebookPage.name)
    private readonly pageModel: Model<FacebookPageDocument>,
  ) {}

  async getManagedPages(userId: string): Promise<ManagedFacebookPage[]> {
    this.logger.log('Getting managed pages for user ' + userId);

    const pages = await this.pageModel
      .find({ userId })
      .select('pageId pageName category pageAvatar')
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
}
