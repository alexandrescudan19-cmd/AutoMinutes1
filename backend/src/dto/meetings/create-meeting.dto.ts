import { AiStatus, MeetingStatus } from '../../models/meeting.schema';

export class CreateMeetingDto {
  ownerId: string;
  title: string;
  description?: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  status?: MeetingStatus;
  aiStatus?: AiStatus;
  googleMeetLink?: string;
  googleCalendarEventId?: string;
  transcriptId?: string;
  aiResultId?: string;
  attendeeIds?: string[];
  invitationIds?: string[];
  notificationIds?: string[];
}
