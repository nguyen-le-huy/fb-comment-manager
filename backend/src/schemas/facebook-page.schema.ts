import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type FacebookPageDocument = HydratedDocument<FacebookPage>;

@Schema({ timestamps: true })
export class FacebookPage {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId!: mongoose.Types.ObjectId;

  @Prop({ required: true, unique: true })
  pageId!: string;

  @Prop({ required: true })
  pageName!: string;

  @Prop({ required: true })
  pageAccessToken!: string;

  @Prop()
  category?: string;

  @Prop()
  pageAvatar?: string;
}

export const FacebookPageSchema = SchemaFactory.createForClass(FacebookPage);
FacebookPageSchema.index({ userId: 1 });
