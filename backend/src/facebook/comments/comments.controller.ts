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

@ApiTags('facebook/comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facebook/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

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
  @ApiResponse({ status: 201, description: 'Reply posted successfully' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  replyToComment(
    @Param('pageId') pageId: string,
    @Param('commentId') commentId: string,
    @Body() dto: ReplyCommentDto,
  ): Promise<{ id: string }> {
    return this.commentsService.replyToComment(pageId, commentId, dto.message);
  }
}
