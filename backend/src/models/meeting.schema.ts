import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum MeetingStatus {
  Upcoming = 'Upcoming',
  InProgress = 'In Progress',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum AiStatus {
  Idle = 'Idle',
  Processing = 'Processing',
  Completed = 'Completed',
  Failed = 'Failed',
}

export type MeetingDocument = HydratedDocument<Meeting>;

@Schema({ timestamps: true })
export class Meeting {
  id!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Date, required: true })
  startDateTime!: Date;

  @Prop({ type: Date, required: true })
  endDateTime!: Date;

  @Prop({ type: String, enum: MeetingStatus, default: MeetingStatus.Upcoming })
  status!: MeetingStatus;

  @Prop({ type: String, enum: AiStatus, default: AiStatus.Idle })
  aiStatus!: AiStatus;

  @Prop({ trim: true })
  googleMeetLink?: string;

  @Prop({ trim: true })
  googleCalendarEventId?: string;

  @Prop({ type: Types.ObjectId, ref: 'Transcript' })
  transcriptId?: string;

  @Prop({ type: Types.ObjectId, ref: 'AIResult' })
  aiResultId?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Attendee', default: [] })
  attendeeIds!: string[];

  @Prop({ type: [Types.ObjectId], ref: 'Invitation', default: [] })
  invitationIds!: string[];

  @Prop({ type: [Types.ObjectId], ref: 'Notification', default: [] })
  notificationIds?: string[];

  createdAt!: string;
  updatedAt!: string;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);
