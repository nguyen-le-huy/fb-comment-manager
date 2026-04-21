import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PostsService } from './posts.service';
import { GetPostsQueryDto } from './dto/get-posts-query.dto';
import { FbPostsResponse } from '../graph-api.service';

@ApiTags('facebook/posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('facebook/posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get(':pageId')
  @ApiOperation({ summary: 'Get paginated posts for a Facebook page' })
  @ApiParam({ name: 'pageId', description: 'Facebook Page ID' })
  @ApiResponse({ status: 200, description: 'Returns list of posts with pagination' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  getPosts(
    @Param('pageId') pageId: string,
    @Query() query: GetPostsQueryDto,
  ): Promise<FbPostsResponse> {
    const limit = query.limit ? parseInt(query.limit, 10) : 10;
    return this.postsService.getPosts(pageId, limit, query.after);
  }
}
