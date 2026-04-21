import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentStateService } from './comment-state.service';
import { MarkReadDto } from './dto/mark-read.dto';

@ApiTags('comment-state')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comment-state')
export class CommentStateController {
  constructor(private readonly commentStateService: CommentStateService) {}

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark one or more comments as read' })
  @ApiResponse({ status: 200, description: 'Returns count of modified documents' })
  markAsRead(@Body() dto: MarkReadDto): Promise<{ modifiedCount: number }> {
    return this.commentStateService.markAsRead(dto.commentIds);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread comment counts grouped by postId' })
  @ApiQuery({ name: 'pageId', required: true, type: String })
  @ApiQuery({ name: 'postId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns map of postId to unread count' })
  getUnreadCount(
    @Query('pageId') pageId: string,
    @Query('postId') postId?: string,
  ): Promise<Record<string, number>> {
    return this.commentStateService.getUnreadCount(pageId, postId);
  }
}
