import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiStatus, Meeting, MeetingDocument, MeetingStatus } from '../models/meeting.schema';

type CreateMeetingData = Omit<
  Meeting,
  'id' | 'createdAt' | 'updatedAt' | 'status' | 'aiStatus' | 'attendeeIds' | 'invitationIds'
> & {
  status?: MeetingStatus;
  aiStatus?: AiStatus;
  attendeeIds?: string[];
  invitationIds?: string[];
  createdAt?: string;
  updatedAt?: string;
};

@Injectable()
export class MeetingsRepository {
  constructor(@InjectModel(Meeting.name) private readonly meetingModel: Model<MeetingDocument>) {}

  async create(data: CreateMeetingData): Promise<Meeting> {
    const meeting = await this.meetingModel.create({
      ...data,
      status: data.status ?? MeetingStatus.Upcoming,
      aiStatus: data.aiStatus ?? AiStatus.Idle,
      attendeeIds: data.attendeeIds ?? [],
      invitationIds: data.invitationIds ?? [],
    });
    return this.toModel(meeting);
  }

  async findAll(): Promise<Meeting[]> {
    const meetings = await this.meetingModel.find().exec();
    return meetings.map((meeting) => this.toModel(meeting));
  }

  async findOne(id: string): Promise<Meeting | undefined> {
    const meeting = await this.meetingModel.findById(id).exec();
    return meeting ? this.toModel(meeting) : undefined;
  }

  async update(id: string, data: Partial<Meeting>): Promise<Meeting | undefined> {
    const rest = { ...data };
    delete rest.id;
    const update = this.withoutUndefined(rest);
    const meeting = await this.meetingModel
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .exec();
    return meeting ? this.toModel(meeting) : undefined;
  }

  async remove(id: string): Promise<Meeting | undefined> {
    const meeting = await this.meetingModel.findByIdAndDelete(id).exec();
    return meeting ? this.toModel(meeting) : undefined;
  }

  private toModel(document: MeetingDocument): Meeting {
    return {
      id: document._id.toString(),
      ownerId: document.ownerId,
      title: document.title,
      description: document.description,
      startDateTime: document.startDateTime,
      endDateTime: document.endDateTime,
      status: document.status,
      aiStatus: document.aiStatus,
      googleMeetLink: document.googleMeetLink,
      googleCalendarEventId: document.googleCalendarEventId,
      transcriptId: document.transcriptId,
      aiResultId: document.aiResultId,
      attendeeIds: document.attendeeIds,
      invitationIds: document.invitationIds,
      notificationIds: document.notificationIds,
      createdAt: document.createdAt?.toString(),
      updatedAt: document.updatedAt?.toString(),
    };
  }

  private withoutUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }
}
