import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GraphApiService, FbPostsResponse } from '../graph-api.service';
import { FacebookPage, FacebookPageDocument } from '../../schemas/facebook-page.schema';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    @InjectModel(FacebookPage.name)
    private readonly pageModel: Model<FacebookPageDocument>,
    private readonly graphApiService: GraphApiService,
  ) {}

  async getPosts(pageId: string, limit = 10, after?: string): Promise<FbPostsResponse> {
    this.logger.log('Getting posts', { pageId, limit });
    const page = await this.pageModel
      .findOne({ pageId })
      .select('pageAccessToken')
      .lean();

    if (!page) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    return this.graphApiService.getPagePosts(
      pageId,
      page.pageAccessToken,
      limit,
      after,
    );
  }
}
