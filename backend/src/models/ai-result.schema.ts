import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class MeetingStatistics {
  @Prop({ type: Number })
  durationMinutes?: number;

  @Prop({ type: Number })
  participantCount?: number;

  @Prop({ type: Number })
  actionItemCount?: number;

  @Prop({ type: String })
  processingStatus?: string;
}

export const MeetingStatisticsSchema = SchemaFactory.createForClass(MeetingStatistics);

export type AIResultDocument = HydratedDocument<AIResult>;

@Schema({ timestamps: true })
export class AIResult {
  id!: string;

  @Prop({ type: Types.ObjectId, ref: 'Meeting', required: true })
  meetingId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Transcript' })
  transcriptId?: string;

  @Prop({ required: true })
  summary!: string;

  @Prop({ type: [String], default: [] })
  keyPoints!: string[];

  @Prop({ type: [String], default: [] })
  decisions!: string[];

  @Prop({ type: String })
  followUpNotes?: string;

  @Prop({ type: [Types.ObjectId], ref: 'ActionItem', default: [] })
  actionItemIds!: string[];

  @Prop({ type: MeetingStatisticsSchema })
  meetingStatistics?: MeetingStatistics;

  @Prop({ type: Date, default: Date.now })
  generatedAt!: Date;

  createdAt!: string;
  updatedAt!: string;
}

export const AIResultSchema = SchemaFactory.createForClass(AIResult);
