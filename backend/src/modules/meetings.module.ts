import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingsController } from '../controllers/meetings.controller';
import { ActionItem, ActionItemSchema } from '../models/action-item.schema';
import { TranscriptsController } from '../controllers/transcripts.controller';
import { AIResult, AIResultSchema } from '../models/ai-result.schema';
import { Attendee, AttendeeSchema } from '../models/attendee.schema';
import { Invitation, InvitationSchema } from '../models/invitation.schema';
import { Meeting, MeetingSchema } from '../models/meeting.schema';
import { Notification, NotificationSchema } from '../models/notification.schema';
import { Transcript, TranscriptSchema } from '../models/transcript.schema';
import { AttendeesRepository } from '../repositories/attendees.repository';
import { ActionItemsRepository } from '../repositories/action-items.repository';
import { AiResultsRepository } from '../repositories/ai-results.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { TranscriptsRepository } from '../repositories/transcripts.repository';
import { GoogleCalendarService } from '../services/google-calendar.service';
import { GoogleMeetTranscriptService } from '../services/google-meet-transcript.service';
import { MeetingsService } from '../services/meetings.service';
import { TranscriptAutoImportService } from '../services/transcript-auto-import.service';
import { UsersModule } from './users.module';
import { CryptoModule } from './crypto.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Meeting.name, schema: MeetingSchema },
      { name: Attendee.name, schema: AttendeeSchema },
      { name: Invitation.name, schema: InvitationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Transcript.name, schema: TranscriptSchema },
      { name: AIResult.name, schema: AIResultSchema },
      { name: ActionItem.name, schema: ActionItemSchema },
    ]),
    UsersModule,
    CryptoModule,
  ],
  controllers: [MeetingsController, TranscriptsController],
  providers: [
    MeetingsService,
    MeetingsRepository,
    GoogleCalendarService,
    GoogleMeetTranscriptService,
    TranscriptAutoImportService,
    AttendeesRepository,
    ActionItemsRepository,
    AiResultsRepository,
    InvitationsRepository,
    NotificationsRepository,
    TranscriptsRepository,
  ],
})
export class MeetingsModule {}
