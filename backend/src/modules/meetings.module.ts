import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingsController } from '../controllers/meetings.controller';
import { TranscriptsController } from '../controllers/transcripts.controller';
import { Attendee, AttendeeSchema } from '../models/attendee.schema';
import { Invitation, InvitationSchema } from '../models/invitation.schema';
import { Meeting, MeetingSchema } from '../models/meeting.schema';
import { Notification, NotificationSchema } from '../models/notification.schema';
import { Transcript, TranscriptSchema } from '../models/transcript.schema';
import { AttendeesRepository } from '../repositories/attendees.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { TranscriptsRepository } from '../repositories/transcripts.repository';
import { GoogleCalendarService } from '../services/google-calendar.service';
import { GoogleMeetTranscriptService } from '../services/google-meet-transcript.service';
import { MeetingsService } from '../services/meetings.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Meeting.name, schema: MeetingSchema },
      { name: Attendee.name, schema: AttendeeSchema },
      { name: Invitation.name, schema: InvitationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Transcript.name, schema: TranscriptSchema },
    ]),
  ],
  controllers: [MeetingsController, TranscriptsController],
  providers: [
    MeetingsService,
    MeetingsRepository,
    GoogleCalendarService,
    GoogleMeetTranscriptService,
    AttendeesRepository,
    InvitationsRepository,
    NotificationsRepository,
    TranscriptsRepository,
  ],
})
export class MeetingsModule {}
