import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GraphApiService, FbComment } from '../graph-api.service';
import { FacebookPage, FacebookPageDocument } from '../../schemas/facebook-page.schema';
import {
  CommentState,
  CommentStateDocument,
} from '../../schemas/comment-state.schema';

export interface CommentWithState extends FbComment {
  isRead: boolean;
  readAt: Date | null;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(
    @InjectModel(FacebookPage.name)
    private readonly pageModel: Model<FacebookPageDocument>,
    @InjectModel(CommentState.name)
    private readonly commentStateModel: Model<CommentStateDocument>,
    private readonly graphApiService: GraphApiService,
  ) {}

  async getComments(
    pageId: string,
    postId: string,
    limit = 25,
    after?: string,
  ): Promise<CommentWithState[]> {
    this.logger.log('Getting comments', { pageId, postId });

    const page = await this.pageModel
      .findOne({ pageId })
      .select('pageAccessToken')
      .lean();

    if (!page) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    const fbResponse = await this.graphApiService.getPostComments(
      postId,
      page.pageAccessToken,
      limit,
      after,
    );

    // Fetch existing states in bulk
    const commentIds = fbResponse.data.map((c) => c.id);
    const states = await this.commentStateModel
      .find({ commentId: { $in: commentIds } })
      .select('commentId isRead readAt')
      .lean();

    const stateMap = new Map(
      states.map((s) => [s.commentId, { isRead: s.isRead, readAt: s.readAt }]),
    );

    return fbResponse.data.map((comment) => ({
      ...comment,
      isRead: stateMap.get(comment.id)?.isRead ?? false,
      readAt: stateMap.get(comment.id)?.readAt ?? null,
    }));
  }

  async replyToComment(
    pageId: string,
    commentId: string,
    message: string,
  ): Promise<{ id: string }> {
    this.logger.log('Replying to comment', { pageId, commentId });

    const page = await this.pageModel
      .findOne({ pageId })
      .select('pageAccessToken')
      .lean();

    if (!page) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    return this.graphApiService.replyToComment(commentId, message, page.pageAccessToken);
  }
}
