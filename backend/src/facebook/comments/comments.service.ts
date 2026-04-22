import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GraphApiService, FbComment } from '../graph-api.service';
import { FacebookPage, FacebookPageDocument } from '../../schemas/facebook-page.schema';
import {
  CommentState,
  CommentStateDocument,
} from '../../schemas/comment-state.schema';
import { FbEventsGateway } from '../../gateway/fb-events.gateway';
import { InboxCommentDto } from './dto/inbox-comment.dto';

interface InboxCommentAttachment {
  type?: string;
  imageUrl?: string;
  url?: string;
  title?: string;
  description?: string;
}

export interface CommentWithState extends FbComment {
  isRead: boolean;
  readAt: Date | null;
}

interface InboxPageProjection {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  pageAvatar?: string;
}



interface PagePostComments {
  page: InboxPageProjection;
  postId: string;
  postContent: string;
  postPermalink?: string;
  postPicture?: string;
  comments: FbComment[];
}

interface InboxCommentCandidate {
  page: InboxPageProjection;
  postId: string;
  postContent: string;
  postPermalink?: string;
  postPicture?: string;
  comment: FbComment;
}

/**
 * Chạy mảng promise-factory theo từng batch, giới hạn concurrency.
 * Tránh gửi quá nhiều request song song tới Facebook Graph API.
 */
async function runInBatches<T>(
  tasks: (() => Promise<T>)[],
  batchSize: number,
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((fn) => fn()));
    results.push(...batchResults);
  }
  return results;
}

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  private mapAttachment(comment: FbComment): InboxCommentAttachment | undefined {
    const attachment = comment.attachment;
    if (!attachment) {
      return undefined;
    }

    const imageUrl = attachment.media?.image?.src;
    const url = attachment.url ?? attachment.target?.url;

    if (!imageUrl && !url && !attachment.title && !attachment.description && !attachment.type) {
      return undefined;
    }

    return {
      type: attachment.type,
      imageUrl,
      url,
      title: attachment.title,
      description: attachment.description,
    };
  }

  private getAvatarUrl(id?: string, pictureUrl?: string): string | undefined {
    if (pictureUrl) {
      return pictureUrl;
    }
    if (!id) {
      return undefined;
    }
    return `https://graph.facebook.com/${id}/picture?type=small`;
  }

  constructor(
    @InjectModel(FacebookPage.name)
    private readonly pageModel: Model<FacebookPageDocument>,
    @InjectModel(CommentState.name)
    private readonly commentStateModel: Model<CommentStateDocument>,
    private readonly graphApiService: GraphApiService,
    private readonly fbEventsGateway: FbEventsGateway,
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

  async getInboxComments(userId: string, limit = 20): Promise<InboxCommentDto[]> {
    this.logger.log('Getting inbox comments for user ' + userId);
    const perPageLimit = Math.min(Math.max(limit, 1), 50);

    const pages = await this.pageModel
      .find({ userId })
      .select('pageId pageName pageAccessToken pageAvatar')
      .lean<InboxPageProjection[]>();

    if (pages.length === 0) {
      return [];
    }

    const pageCandidateResults = await Promise.allSettled(
      pages.map(async (page): Promise<InboxCommentCandidate[]> => {
        const postsResponse = await this.graphApiService.getPagePosts(
          page.pageId,
          page.pageAccessToken,
          5,
        );

        const postCommentResults = await runInBatches(
          postsResponse.data.map((post) => async (): Promise<PagePostComments> => {
            const commentsResponse = await this.graphApiService.getPostComments(
              post.id,
              page.pageAccessToken,
              20,
            );

            return {
              page,
              postId: post.id,
              postContent: post.message ?? post.story ?? '',
              postPermalink: post.permalink_url,
              postPicture: post.full_picture,
              comments: commentsResponse.data,
            };
          }),
          3, // tối đa 3 post một lúc — tránh throttle từ Facebook
        );

        const pagePostComments = postCommentResults.flatMap((result, index) => {
          if (result.status === 'fulfilled') {
            return [result.value];
          }

          const postId = postsResponse.data[index]?.id ?? 'unknown';
          this.logger.warn(
            `Skipping comments fetch for post ${postId} on page ${page.pageId} because Graph API request failed`,
          );
          return [];
        });

        return pagePostComments
          .flatMap((item: PagePostComments) =>
            item.comments.map((comment: FbComment): InboxCommentCandidate => ({
              page: item.page,
              postId: item.postId,
              postContent: item.postContent,
              postPermalink: item.postPermalink,
              postPicture: item.postPicture,
              comment,
            })),
          )
          .sort(
            (a: InboxCommentCandidate, b: InboxCommentCandidate) =>
              new Date(b.comment.created_time).getTime() -
              new Date(a.comment.created_time).getTime(),
          )
          .slice(0, perPageLimit);
      }),
    );

    const pageCandidates = pageCandidateResults.flatMap((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }

      const pageId = pages[index]?.pageId ?? 'unknown';
      this.logger.warn(
        `Skipping page ${pageId} in inbox aggregation because posts fetch failed`,
      );
      return [];
    });

    const candidates = pageCandidates.flat();
    if (candidates.length === 0) {
      return [];
    }

    const commentIds = candidates.map((candidate) => candidate.comment.id);

    // Upsert only unseen candidates (insert new comment_state docs)
    const existingCommentStateMap = new Map(
      (
        await this.commentStateModel
          .find({ commentId: { $in: commentIds } })
          .select('commentId isRead readAt')
          .lean<{ commentId: string; isRead: boolean; readAt: Date | null }[]>()
      ).map((s) => [s.commentId, { isRead: s.isRead, readAt: s.readAt }]),
    );

    const unseenCandidates = candidates.filter(
      (candidate) => !existingCommentStateMap.has(candidate.comment.id),
    );

    if (unseenCandidates.length > 0) {
      await this.commentStateModel.bulkWrite(
        unseenCandidates.map((candidate) => ({
          updateOne: {
            filter: { commentId: candidate.comment.id },
            update: {
              $setOnInsert: {
                pageId: candidate.page.pageId,
                postId: candidate.postId,
                commentId: candidate.comment.id,
                fromId: candidate.comment.from?.id,
                fromName: candidate.comment.from?.name,
                message: candidate.comment.message ?? '',
                createdTime: new Date(candidate.comment.created_time),
                isRead: false,
                readAt: null,
              },
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );
    }

    // Return ALL candidates (seen + unseen), merging isRead state from DB
    const result = candidates.map((candidate): InboxCommentDto => {
      const state = existingCommentStateMap.get(candidate.comment.id);
      const pageLogo = this.getAvatarUrl(candidate.page.pageId, candidate.page.pageAvatar);
      const authorAvatar = this.getAvatarUrl(
        candidate.comment.from?.id,
        candidate.comment.from?.picture?.data?.url,
      );
      const attachment = this.mapAttachment(candidate.comment);
      const replies = (candidate.comment.comments?.data ?? []).map(
        (reply): InboxCommentDto['replies'][number] => {
          const replyAuthorAvatar = this.getAvatarUrl(
            reply.from?.id,
            reply.from?.picture?.data?.url,
          );

          return {
            replyId: reply.id,
            author: {
              id: reply.from?.id ?? '',
              name: reply.from?.name ?? 'Unknown',
              avatar: replyAuthorAvatar,
            },
            message: reply.message ?? '',
            createdTime: new Date(reply.created_time).toISOString(),
          };
        },
      );

      return {
        commentId: candidate.comment.id,
        pageId: candidate.page.pageId,
        postId: candidate.postId,
        author: {
          id: candidate.comment.from?.id ?? '',
          name: candidate.comment.from?.name ?? 'Unknown',
          avatar: authorAvatar,
        },
        page: {
          id: candidate.page.pageId,
          name: candidate.page.pageName,
          logo: pageLogo,
        },
        post: {
          id: candidate.postId,
          content: candidate.postContent,
          permalink: candidate.postPermalink,
          picture: candidate.postPicture,
        },
        message: candidate.comment.message ?? '',
        attachment,
        createdTime: new Date(candidate.comment.created_time).toISOString(),
        isRead: state?.isRead ?? false,
        readAt: state?.readAt ? state.readAt.toISOString() : null,
        replies,
      };
    });

    return result.sort(
      (a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime(),
    );
  }

  async replyToComment(
    pageId: string,
    commentId: string,
    message: string,
  ): Promise<{ id: string; commentId: string; pageId: string }> {
    this.logger.log('Replying to comment', { pageId, commentId });

    const page = await this.pageModel
      .findOne({ pageId })
      .select('pageAccessToken pageName')
      .lean();

    if (!page) {
      throw new NotFoundException(`Page ${pageId} not found`);
    }

    const reply = await this.graphApiService.replyToComment(
      commentId,
      message,
      page.pageAccessToken,
    );

    this.fbEventsGateway.emitCommentReplied({
      commentId,
      pageId,
      reply: {
        replyId: reply.id,
        author: {
          id: pageId,
          name: page.pageName,
        },
        message,
        createdTime: new Date().toISOString(),
      },
    });

    return {
      id: reply.id,
      commentId,
      pageId,
    };
  }
}
