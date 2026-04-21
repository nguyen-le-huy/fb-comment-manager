import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CommentState, CommentStateDocument } from '../schemas/comment-state.schema';
import { FbEventsGateway } from '../gateway/fb-events.gateway';

@Injectable()
export class CommentStateService {
  private readonly logger = new Logger(CommentStateService.name);

  constructor(
    @InjectModel(CommentState.name)
    private readonly commentStateModel: Model<CommentStateDocument>,
    private readonly fbEventsGateway: FbEventsGateway,
  ) {}

  async markAsRead(
    commentIds: string[],
  ): Promise<{ modifiedCount: number }> {
    this.logger.log(`Marking ${commentIds.length} comments as read`);
    const result = await this.commentStateModel.updateMany(
      { commentId: { $in: commentIds }, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );

    // Emit read events for each updated comment
    const updatedStates = await this.commentStateModel
      .find({ commentId: { $in: commentIds } })
      .select('commentId postId')
      .lean();

    for (const state of updatedStates) {
      this.fbEventsGateway.emitCommentRead({
        postId: state.postId,
        commentId: state.commentId,
      });
    }

    return { modifiedCount: result.modifiedCount };
  }

  async getUnreadCount(pageId: string, postId?: string): Promise<Record<string, number>> {
    this.logger.log('Getting unread count', { pageId, postId });

    const match: Record<string, unknown> = { pageId, isRead: false };
    if (postId) match['postId'] = postId;

    const grouped = await this.commentStateModel.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: match },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {};
    for (const item of grouped) {
      result[item._id] = item.count;
    }
    return result;
  }
}
