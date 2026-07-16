import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TranscriptDocument = HydratedDocument<Transcript>;

@Schema({ timestamps: true })
export class Transcript {
  id!: string;

  @Prop({ type: Types.ObjectId, ref: 'Meeting', required: true })
  meetingId!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true, trim: true })
  fileFormat!: string;

  @Prop({ type: Date, default: Date.now })
  uploadedAt!: Date;

  createdAt!: string;
  updatedAt!: string;
}

export const TranscriptSchema = SchemaFactory.createForClass(Transcript);
