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

  @Prop({ default: Date.now })
  sentAt!: string;

  createdAt!: string;
  updatedAt!: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
