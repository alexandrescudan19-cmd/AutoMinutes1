import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ProcessTranscriptDto } from '../dto/ai/process-transcript.dto';
import { ActionItem, ActionItemStatus } from '../models/action-item.schema';
import { AiStatus, Meeting } from '../models/meeting.schema';
import { ActionItemsRepository } from '../repositories/action-items.repository';
import { AiResultsRepository } from '../repositories/ai-results.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { TranscriptsRepository } from '../repositories/transcripts.repository';
import { AuthenticatedUser } from './meetings.service';
import { OllamaService } from './ollama.service';

interface AiTranscriptResult {
  summary: string;
  keyPoints?: string[];
  decisions?: string[];
  meetingStatistics?: {
    durationMinutes?: number;
    participantCount?: number;
    actionItemCount?: number;
    processingStatus?: string;
  };
  actionItems?: Array<{
    task: string;
    responsiblePerson?: string;
    dueDate?: string;
    status?: ActionItemStatus;
    confidenceScore?: number;
  }>;
}

export interface ActionItemListItem extends ActionItem {
  meetingId: string;
  meetingTitle: string;
}

@Injectable()
export class AiService {
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly meetingsRepository: MeetingsRepository,
    private readonly transcriptsRepository: TranscriptsRepository,
    private readonly aiResultsRepository: AiResultsRepository,
    private readonly actionItemsRepository: ActionItemsRepository,
    private readonly invitationsRepository: InvitationsRepository,
  ) {}

  getStatus() {
    return { status: 'ok', service: 'ai-transcript', ollama: this.ollamaService.getInfo() };
  }

  async getResult(aiResultId: string, user: AuthenticatedUser) {
    const { aiResult } = await this.getAccessibleAiResult(aiResultId, user);
    return aiResult;
  }

  async getSummary(aiResultId: string, user: AuthenticatedUser) {
    const { aiResult } = await this.getAccessibleAiResult(aiResultId, user);
    return {
      aiResultId: aiResult.id,
      meetingId: aiResult.meetingId,
      summary: aiResult.summary,
      generatedAt: aiResult.generatedAt,
    };
  }

  async getKeyPoints(aiResultId: string, user: AuthenticatedUser) {
    const { aiResult } = await this.getAccessibleAiResult(aiResultId, user);
    return {
      aiResultId: aiResult.id,
      meetingId: aiResult.meetingId,
      keyPoints: aiResult.keyPoints,
    };
  }

  async getDecisions(aiResultId: string, user: AuthenticatedUser) {
    const { aiResult } = await this.getAccessibleAiResult(aiResultId, user);
    return {
      aiResultId: aiResult.id,
      meetingId: aiResult.meetingId,
      decisions: aiResult.decisions,
    };
  }

  async getActionItems(aiResultId: string, user: AuthenticatedUser) {
    const { aiResult, meeting } = await this.getAccessibleAiResult(aiResultId, user);
    const actionItems = await this.actionItemsRepository.findByAiResultId(aiResult.id);

    return {
      aiResultId: aiResult.id,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      actionItems: actionItems.map((actionItem) => this.withMeeting(actionItem, meeting)),
    };
  }

  async listActionItems(user: AuthenticatedUser, filters?: { status?: ActionItemStatus }) {
    const meetings = await this.findAccessibleMeetings(user);
    const meetingsByAiResultId = new Map(
      meetings
        .filter((meeting) => meeting.aiResultId)
        .map((meeting) => [meeting.aiResultId as string, meeting]),
    );
    const actionItems = await this.actionItemsRepository.findByAiResultIds([
      ...meetingsByAiResultId.keys(),
    ]);
    const filteredActionItems = filters?.status
      ? actionItems.filter((actionItem) => actionItem.status === filters.status)
      : actionItems;

    return filteredActionItems
      .map((actionItem) => {
        const meeting = meetingsByAiResultId.get(actionItem.aiResultId ?? '');
        return meeting ? this.withMeeting(actionItem, meeting) : undefined;
      })
      .filter((actionItem): actionItem is ActionItemListItem => Boolean(actionItem));
  }

  async processTranscript(processTranscriptDto: ProcessTranscriptDto, user?: AuthenticatedUser) {
    const { meetingId, language = 'ro' } = processTranscriptDto;
    const meeting = await this.meetingsRepository.findOne(meetingId);
    if (!meeting) {
      throw new NotFoundException(`Meeting #${meetingId} not found`);
    }
    if (user) {
      await this.assertCanAccessMeeting(meeting, user);
    }

    const transcript = await this.resolveTranscript(processTranscriptDto);
    if (!transcript.content.trim()) {
      throw new BadRequestException('Transcriptul nu poate fi gol.');
    }

    await this.meetingsRepository.update(meetingId, { aiStatus: AiStatus.Processing });

    try {
      const aiOutput = await this.ollamaService.generateJson<AiTranscriptResult>(
        this.buildPrompt(transcript.content, language),
      );

      const aiResult = await this.aiResultsRepository.create({
        meetingId,
        transcriptId: transcript.id,
        summary: aiOutput.summary,
        keyPoints: aiOutput.keyPoints ?? [],
        decisions: aiOutput.decisions ?? [],
        meetingStatistics: {
          ...aiOutput.meetingStatistics,
          actionItemCount: aiOutput.actionItems?.length ?? 0,
          processingStatus: AiStatus.Completed,
        },
      });

      const actionItems = await Promise.all(
        (aiOutput.actionItems ?? []).map((actionItem) =>
          this.actionItemsRepository.create({
            aiResultId: aiResult.id,
            task: actionItem.task,
            responsiblePerson: actionItem.responsiblePerson ?? 'Nealocat',
            dueDate: this.parseDueDate(actionItem.dueDate),
            status: actionItem.status ?? ActionItemStatus.Pending,
            confidenceScore: this.clampConfidence(actionItem.confidenceScore),
          }),
        ),
      );

      const updatedAiResult = await this.aiResultsRepository.update(aiResult.id, {
        actionItemIds: actionItems.map((actionItem) => actionItem.id),
      });

      await this.meetingsRepository.update(meetingId, {
        aiStatus: AiStatus.Completed,
        transcriptId: transcript.id,
        aiResultId: aiResult.id,
      });

      return {
        meetingId,
        transcript,
        aiResult: updatedAiResult ?? aiResult,
        actionItems,
      };
    } catch (error) {
      await this.meetingsRepository.update(meetingId, { aiStatus: AiStatus.Failed });
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'AI processing failed.',
      );
    }
  }

  private async resolveTranscript(processTranscriptDto: ProcessTranscriptDto) {
    if (processTranscriptDto.transcript?.trim()) {
      return this.transcriptsRepository.create({
        meetingId: processTranscriptDto.meetingId,
        content: processTranscriptDto.transcript,
        fileFormat: processTranscriptDto.fileFormat ?? 'text',
      });
    }

    if (processTranscriptDto.transcriptId) {
      const transcript = await this.transcriptsRepository.findOne(
        processTranscriptDto.transcriptId,
      );
      if (!transcript) {
        throw new NotFoundException(`Transcript #${processTranscriptDto.transcriptId} not found`);
      }
      return transcript;
    }

    throw new BadRequestException('Trimite transcriptId sau transcript.');
  }

  private buildPrompt(transcript: string, language: string): string {
    if (language.toLowerCase().startsWith('en')) {
      return `
You are an assistant that extracts structured meeting results.
Return STRICTLY valid JSON. Do not include markdown, comments, or extra text.
Response language: English.

Required JSON schema:
{
  "summary": "specific meeting summary",
  "keyPoints": ["specific key point from the transcript"],
  "decisions": ["specific decision from the transcript"],
  "meetingStatistics": {
    "durationMinutes": 0,
    "participantCount": 0,
    "actionItemCount": 0,
    "processingStatus": "Completed"
  },
  "actionItems": [
    {
      "task": "specific task from the transcript",
      "responsiblePerson": "person responsible, or Unassigned",
      "dueDate": "YYYY-MM-DD or null",
      "status": "Pending",
      "confidenceScore": 0.0
    }
  ]
}

Action item rules:
- Extract ALL action items, not just the first two.
- Include commitments expressed with "I'll", "I will", "please", "can you", "should", "we need", and "let's include".
- Include tasks with no deadline and set dueDate to null.
- Do not invent deadlines. Only infer a date if the transcript provides a meeting date and a clear relative deadline.
- Do not invent action items that are not supported by the transcript.
- Include tasks for transcript upload, frontend integration, realistic transcript examples, testing, critical bug reporting, editable AI results, previous AI result comparison, and exposing meeting statistics through the API when present.
- Do not include a Sprint 2 idea as an action item unless the transcript assigns a clear responsible person.
- Use status only as "Pending", "In Progress", or "Completed".
- confidenceScore must be between 0 and 1.
- meetingStatistics.actionItemCount must equal actionItems.length.
- Summary, keyPoints, and decisions must be concrete. Avoid placeholders like "meeting summary" or "decisions taken".

Transcript:
${transcript}
`;
    }

    return `
Proceseaza transcriptul de sedinta de mai jos si raspunde strict in JSON valid.
Nu include markdown, comentarii sau text in afara JSON-ului.
Limba raspunsului: ${language}.

Schema JSON obligatorie:
{
  "summary": "rezumat specific al sedintei",
  "keyPoints": ["punct cheie specific din transcript"],
  "decisions": ["decizie specifica din transcript"],
  "meetingStatistics": {
    "durationMinutes": 0,
    "participantCount": 0,
    "actionItemCount": 0,
    "processingStatus": "Completed"
  },
  "actionItems": [
    {
      "task": "sarcina specifica din transcript",
      "responsiblePerson": "persoana responsabila sau Nealocat",
      "dueDate": "YYYY-MM-DD sau null",
      "status": "Pending",
      "confidenceScore": 0.0
    }
  ]
}

Reguli obligatorii pentru actionItems:
- Extrage TOATE actiunile, nu doar primele doua.
- Include angajamente exprimate prin "I'll", "I will", "please", "can you", "should", "we need", "let's include".
- Include task-uri fara deadline cu dueDate null.
- Nu inventa deadline-uri. Deduci o data doar daca transcriptul are data sedintei si un deadline relativ clar.
- Nu inventa actiuni care nu sunt sustinute de transcript.
- Include task-uri pentru upload transcript, integrare frontend, exemple realiste de transcript, testare, raportare bug-uri critice, editare rezultate AI, comparare rezultate AI anterioare si expunere statistici prin API cand apar in transcript.
- Nu include o idee amanata pentru Sprint 2 ca action item decat daca exista responsabil clar.
- Foloseste status doar cu una dintre valorile: "Pending", "In Progress", "Completed".
- confidenceScore trebuie sa fie intre 0 si 1.
- meetingStatistics.actionItemCount trebuie sa fie egal cu actionItems.length.
- Summary, keyPoints si decisions trebuie sa fie concrete. Evita placeholder-e.

Transcript:
${transcript}
`;
  }

  private parseDueDate(dueDate?: string): Date | undefined {
    if (!dueDate || dueDate.toLowerCase() === 'null') return undefined;
    const date = new Date(dueDate);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private clampConfidence(confidenceScore?: number): number | undefined {
    if (confidenceScore === undefined) return undefined;
    return Math.min(1, Math.max(0, confidenceScore));
  }

  private async getAccessibleAiResult(aiResultId: string, user: AuthenticatedUser) {
    const aiResult = await this.aiResultsRepository.findOne(aiResultId);
    if (!aiResult) {
      throw new NotFoundException(`AI result #${aiResultId} not found`);
    }

    const meeting = await this.meetingsRepository.findOne(aiResult.meetingId);
    if (!meeting) {
      throw new NotFoundException(`Meeting #${aiResult.meetingId} not found`);
    }

    await this.assertCanAccessMeeting(meeting, user);
    return { aiResult, meeting };
  }

  private async findAccessibleMeetings(user: AuthenticatedUser): Promise<Meeting[]> {
    const invitations = await this.invitationsRepository.findByParticipantEmail(user.email);
    return this.meetingsRepository.findAccessible(
      user.userId,
      invitations.map((invitation) => invitation.meetingId),
    );
  }

  private withMeeting(actionItem: ActionItem, meeting: Meeting): ActionItemListItem {
    return {
      ...actionItem,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
    };
  }

  private async assertCanAccessMeeting(
    meeting: { id: string; ownerId: string },
    user: AuthenticatedUser,
  ): Promise<void> {
    if (meeting.ownerId?.toString() === user.userId) {
      return;
    }

    const invitations = await this.invitationsRepository.findByParticipantEmail(user.email);
    const isInvited = invitations.some(
      (invitation) => invitation.meetingId.toString() === meeting.id,
    );
    if (!isInvited) {
      throw new NotFoundException(`Meeting #${meeting.id} not found`);
    }
  }
}
