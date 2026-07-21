import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  id!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true, trim: true })
  type!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  recipientEmail!: string;

  @Prop({ trim: true })
  meetingId?: string;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop({ default: Date.now })
  sentAt!: string;

  createdAt!: string;
  updatedAt!: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
