import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiController } from '../controllers/ai.controller';
import { ActionItem, ActionItemSchema } from '../models/action-item.schema';
import { AIResult, AIResultSchema } from '../models/ai-result.schema';
import { Invitation, InvitationSchema } from '../models/invitation.schema';
import { Meeting, MeetingSchema } from '../models/meeting.schema';
import { Transcript, TranscriptSchema } from '../models/transcript.schema';
import { ActionItemsRepository } from '../repositories/action-items.repository';
import { AiResultsRepository } from '../repositories/ai-results.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { TranscriptsRepository } from '../repositories/transcripts.repository';
import { AiProviderService } from '../services/ai-provider.service';
import { AiService } from '../services/ai.service';
import { OllamaService } from '../services/ollama.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Meeting.name, schema: MeetingSchema },
      { name: Transcript.name, schema: TranscriptSchema },
      { name: AIResult.name, schema: AIResultSchema },
      { name: ActionItem.name, schema: ActionItemSchema },
      { name: Invitation.name, schema: InvitationSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiProviderService,
    OllamaService,
    MeetingsRepository,
    TranscriptsRepository,
    AiResultsRepository,
    ActionItemsRepository,
    InvitationsRepository,
  ],
})
export class AiModule {}
