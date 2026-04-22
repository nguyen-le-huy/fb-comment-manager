import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FacebookPage, FacebookPageDocument } from '../schemas/facebook-page.schema';
import { CommentState, CommentStateDocument } from '../schemas/comment-state.schema';
import { GraphApiService } from '../facebook/graph-api.service';
import { FbEventsGateway } from '../gateway/fb-events.gateway';

interface WebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    field: string;
    value: {
      item?: string;
      verb?: string;
      comment_id?: string;
      post_id?: string;
      parent_id?: string;
      from?: { id: string; name: string };
      message?: string;
      created_time?: number;
    };
  }>;
}

interface FacebookWebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectModel(FacebookPage.name)
    private readonly pageModel: Model<FacebookPageDocument>,
    @InjectModel(CommentState.name)
    private readonly commentStateModel: Model<CommentStateDocument>,
    private readonly graphApiService: GraphApiService,
    private readonly fbEventsGateway: FbEventsGateway,
  ) {}

  async handleFacebookEvent(payload: FacebookWebhookPayload): Promise<void> {
    if (payload.object !== 'page') {
      this.logger.warn('Ignoring non-page webhook event');
      return;
    }

    for (const entry of payload.entry) {
      const pageId = entry.id;

      for (const change of entry.changes) {
        if (change.field !== 'feed') continue;

        const { value } = change;
        if (value.item !== 'comment' || value.verb !== 'add') continue;

        this.logger.log('Processing new comment webhook event', {
          pageId,
          commentId: value.comment_id,
          postId: value.post_id,
        });

        // Run async — webhook must return 200 immediately
        void this.processNewComment(pageId, value);
      }
    }
  }

  private async processNewComment(
    pageId: string,
    value: WebhookEntry['changes'][0]['value'],
  ): Promise<void> {
    const commentId = value.comment_id;
    const postId = value.post_id;
    const parentCommentId = value.parent_id;

    if (!commentId || !postId) return;

    const isReply = !!parentCommentId && parentCommentId !== postId;

    try {
      const page = await this.pageModel
        .findOne({ pageId })
        .select('pageAccessToken')
        .lean();

      if (!page) {
        this.logger.warn(`Page ${pageId} not found in DB, skipping webhook event`);
        return;
      }

      const comment = await this.graphApiService.getCommentById(
        commentId,
        page.pageAccessToken,
      );

      const createdTime = value.created_time
        ? new Date(value.created_time * 1000)
        : new Date();
      const isAdmin = comment.from?.id === pageId;

      if (isReply) {
        if (!parentCommentId) {
          this.logger.warn('Missing parent_id for reply comment ' + commentId);
          return;
        }

        if (!isAdmin) {
          await this.commentStateModel.updateOne(
            { commentId: parentCommentId },
            {
              $set: {
                isRead: false,
                readAt: null,
              },
            },
          );
        }

        this.fbEventsGateway.emitCommentReplied({
          commentId: parentCommentId,
          pageId,
          reply: {
            replyId: commentId,
            author: {
              id: comment.from?.id ?? '',
              name: comment.from?.name ?? 'Unknown',
            },
            message: comment.message ?? '',
            createdTime: createdTime.toISOString(),
          },
        });

        return;
      }

      await this.commentStateModel.findOneAndUpdate(
        { commentId },
        {
          $set: {
            pageId,
            postId,
            commentId,
            fromId: comment.from?.id,
            fromName: comment.from?.name,
            message: comment.message,
            createdTime,
            isRead: isAdmin,
            readAt: isAdmin ? createdTime : null,
          },
        },
        { upsert: true },
      );

      this.fbEventsGateway.emitNewComment({
        pageId,
        postId,
        commentId,
        author: {
          id: comment.from?.id ?? '',
          name: comment.from?.name ?? 'Unknown',
          avatar: comment.from?.picture?.data?.url,
        },
        message: comment.message ?? '',
        attachment: comment.attachment
          ? {
              type: comment.attachment.type,
              imageUrl: comment.attachment.media?.image?.src,
              url: comment.attachment.url ?? comment.attachment.target?.url,
              title: comment.attachment.title,
              description: comment.attachment.description,
            }
          : undefined,
        createdTime: createdTime.toISOString(),
      });
    } catch (error) {
      this.logger.error(
        `Failed to process webhook comment ${commentId}`,
        (error as Error).stack,
      );
    }
  }
}
