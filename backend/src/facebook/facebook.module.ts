import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GraphApiService } from './graph-api.service';
import { PostsService } from './posts/posts.service';
import { PostsController } from './posts/posts.controller';
import { CommentsService } from './comments/comments.service';
import { CommentsController } from './comments/comments.controller';
import { PagesService } from './pages/pages.service';
import { PagesController } from './pages/pages.controller';
import { FacebookPage, FacebookPageSchema } from '../schemas/facebook-page.schema';
import { CommentState, CommentStateSchema } from '../schemas/comment-state.schema';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FacebookPage.name, schema: FacebookPageSchema },
      { name: CommentState.name, schema: CommentStateSchema },
    ]),
    GatewayModule,
  ],
  controllers: [PostsController, CommentsController, PagesController],
  providers: [GraphApiService, PostsService, CommentsService, PagesService],
  exports: [GraphApiService],
})
export class FacebookModule {}
