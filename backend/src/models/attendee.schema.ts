import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum AttendanceStatus {
  Invited = 'Invitat',
  Accepted = 'Acceptat',
  Declined = 'Respins',
}

export type AttendeeDocument = HydratedDocument<Attendee>;

@Schema({ timestamps: true })
export class Attendee {
  id!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  roleInMeeting!: string;

  @Prop({ type: String, enum: AttendanceStatus, default: AttendanceStatus.Invited })
  attendanceStatus!: AttendanceStatus;

  createdAt!: string;
  updatedAt!: string;
}

export const AttendeeSchema = SchemaFactory.createForClass(Attendee);
