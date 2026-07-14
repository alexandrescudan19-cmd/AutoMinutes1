import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { AttendanceStatus } from './attendee.schema';

export type InvitationDocument = HydratedDocument<Invitation>;

@Schema({ timestamps: true })
export class Invitation {
  id: string;

  @Prop({ type: Types.ObjectId, ref: 'Meeting', required: true })
  meetingId: string;

  @Prop({ required: true, lowercase: true, trim: true })
  participantEmail: string;

  @Prop({ enum: AttendanceStatus, default: AttendanceStatus.Invited })
  invitationStatus: AttendanceStatus;

  @Prop({ default: Date.now })
  sentAt: string;

  createdAt: string;
  updatedAt: string;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
