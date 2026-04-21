import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommentStateController } from './comment-state.controller';
import { CommentStateService } from './comment-state.service';
import { CommentState, CommentStateSchema } from '../schemas/comment-state.schema';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommentState.name, schema: CommentStateSchema },
    ]),
    GatewayModule,
  ],
  controllers: [CommentStateController],
  providers: [CommentStateService],
})
export class CommentStateModule {}
