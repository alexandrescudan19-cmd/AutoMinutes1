import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommentDocument = HydratedDocument<Comment>;

@Schema({ timestamps: true })
export class Comment {
  id!: string;

  @Prop({ type: Types.ObjectId, ref: 'Meeting', required: true })
  meetingId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId!: string;

  @Prop({ required: true, trim: true })
  authorName!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  authorEmail!: string;

  @Prop({ required: true, trim: true })
  message!: string;

  createdAt!: string;
  updatedAt!: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
