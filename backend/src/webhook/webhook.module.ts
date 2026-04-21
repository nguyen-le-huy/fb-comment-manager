import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { FacebookPage, FacebookPageSchema } from '../schemas/facebook-page.schema';
import { CommentState, CommentStateSchema } from '../schemas/comment-state.schema';
import { FacebookModule } from '../facebook/facebook.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FacebookPage.name, schema: FacebookPageSchema },
      { name: CommentState.name, schema: CommentStateSchema },
    ]),
    FacebookModule,
    GatewayModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
