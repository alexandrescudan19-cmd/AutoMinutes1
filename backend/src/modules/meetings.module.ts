import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MeetingsController, PublicMeetingsController } from '../controllers/meetings.controller';
import { ActionItem, ActionItemSchema } from '../models/action-item.schema';
import { TranscriptsController } from '../controllers/transcripts.controller';
import { AIResult, AIResultSchema } from '../models/ai-result.schema';
import { Attendee, AttendeeSchema } from '../models/attendee.schema';
import { Invitation, InvitationSchema } from '../models/invitation.schema';
import { Meeting, MeetingSchema } from '../models/meeting.schema';
import { Notification, NotificationSchema } from '../models/notification.schema';
import { Transcript, TranscriptSchema } from '../models/transcript.schema';
import { Comment, CommentSchema } from '../models/comment.schema';
import { AttendeesRepository } from '../repositories/attendees.repository';
import { ActionItemsRepository } from '../repositories/action-items.repository';
import { AiResultsRepository } from '../repositories/ai-results.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { TranscriptsRepository } from '../repositories/transcripts.repository';
import { CommentsRepository } from '../repositories/comments.repository';
import { GoogleCalendarService } from '../services/google-calendar.service';
import { GoogleMeetTranscriptService } from '../services/google-meet-transcript.service';
import { MeetingsService } from '../services/meetings.service';
import { TranscriptAutoImportService } from '../services/transcript-auto-import.service';
import { UsersModule } from './users.module';
import { CryptoModule } from './crypto.module';
import { RealtimeModule } from './realtime.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Meeting.name, schema: MeetingSchema },
      { name: Attendee.name, schema: AttendeeSchema },
      { name: Invitation.name, schema: InvitationSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Transcript.name, schema: TranscriptSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: AIResult.name, schema: AIResultSchema },
      { name: ActionItem.name, schema: ActionItemSchema },
    ]),
    UsersModule,
    CryptoModule,
    RealtimeModule,
  ],
  controllers: [MeetingsController, PublicMeetingsController, TranscriptsController],
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
    CommentsRepository,
  ],
})
export class MeetingsModule {}
