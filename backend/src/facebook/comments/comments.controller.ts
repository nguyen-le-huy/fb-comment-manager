import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CommentsService, CommentWithState } from './comments.service';
import { ReplyCommentDto } from './dto/reply-comment.dto';
import { InboxCommentDto } from './dto/inbox-comment.dto';
import { GetInboxQueryDto } from './dto/get-inbox-query.dto';
import { GetUser, AuthUser } from '../../auth/decorators/get-user.decorator';

@ApiTags('facebook/comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facebook/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('inbox')
  @ApiOperation({ summary: 'Get all comments across all managed pages (inbox view)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns flat list of comments sorted by time' })
  getInbox(
    @GetUser() user: AuthUser,
    @Query() query: GetInboxQueryDto,
  ): Promise<InboxCommentDto[]> {
    return this.commentsService.getInboxComments(user.userId, query.limit ?? 20);
  }

  @Get(':pageId/:postId')
  @ApiOperation({ summary: 'Get all comments for a post (merged with read state)' })
  @ApiParam({ name: 'pageId', description: 'Facebook Page ID' })
  @ApiParam({ name: 'postId', description: 'Facebook Post ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns list of comments with read status' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  getComments(
    @Param('pageId') pageId: string,
    @Param('postId') postId: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
  ): Promise<CommentWithState[]> {
    return this.commentsService.getComments(
      pageId,
      postId,
      limit ? parseInt(limit, 10) : 25,
      after,
    );
  }

  @Post(':pageId/:commentId/reply')
  @ApiOperation({ summary: 'Reply to a comment on behalf of the page' })
  @ApiParam({ name: 'pageId', description: 'Facebook Page ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID to reply to' })
  @ApiResponse({
    status: 201,
    description: 'Reply posted — returns { id, commentId, pageId }',
  })
  @ApiResponse({ status: 404, description: 'Page not found' })
  replyToComment(
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() dto: ReplyCommentDto,
  ): Promise<{ id: string; commentId: string; pageId: string }> {
    return this.commentsService.replyToComment(pageId, commentId, dto.message);
  }
}
