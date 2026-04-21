import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CommentStateDocument = HydratedDocument<CommentState>;

@Schema({ timestamps: true })
export class CommentState {
  @Prop({ required: true })
  pageId!: string;

  @Prop({ required: true })
  postId!: string;

  @Prop({ required: true, unique: true })
  commentId!: string;

  @Prop()
  fromId?: string;

  @Prop()
  fromName?: string;

  @Prop()
  message?: string;

  @Prop()
  createdTime?: Date;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop({ type: Date, default: null })
  readAt!: Date | null;
}

export const CommentStateSchema = SchemaFactory.createForClass(CommentState);

// Compound index for efficient unread queries per page/post
CommentStateSchema.index({ pageId: 1, postId: 1 });
CommentStateSchema.index({ commentId: 1 }, { unique: true });
