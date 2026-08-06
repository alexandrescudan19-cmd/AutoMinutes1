import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CreateActionItemDto } from '../dto/ai/create-action-item.dto';
import { ProcessTranscriptDto } from '../dto/ai/process-transcript.dto';
import { UpdateActionItemDto } from '../dto/ai/update-action-item.dto';
import { ActionItem, ActionItemStatus } from '../models/action-item.schema';
import { AIResult } from '../models/ai-result.schema';
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
  followUpNotes?: string;
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
    // Returneaza starea serviciului AI. acum.
    return { status: 'ok', service: 'ai-transcript', ollama: this.ollamaService.getInfo() };
  }

  async getResult(aiResultId: string, user: AuthenticatedUser) {
    // Returneaza rezultatul AI complet. acum.
    const { aiResult } = await this.getAccessibleAiResult(aiResultId, user);
    return aiResult;
  }

  async getSummary(aiResultId: string, user: AuthenticatedUser) {
    // Returneaza rezumatul separat AI. acum.
    const { aiResult } = await this.getAccessibleAiResult(aiResultId, user);
    return {
      aiResultId: aiResult.id,
      meetingId: aiResult.meetingId,
      summary: aiResult.summary,
      generatedAt: aiResult.generatedAt,
    };
  }

  async getKeyPoints(aiResultId: string, user: AuthenticatedUser) {
    // Returneaza punctele cheie separat. acum.
    const { aiResult } = await this.getAccessibleAiResult(aiResultId, user);
    return {
      aiResultId: aiResult.id,
      meetingId: aiResult.meetingId,
      keyPoints: aiResult.keyPoints,
    };
  }

  async getDecisions(aiResultId: string, user: AuthenticatedUser) {
    // Returneaza deciziile extrase separat. acum.
    const { aiResult } = await this.getAccessibleAiResult(aiResultId, user);
    return {
      aiResultId: aiResult.id,
      meetingId: aiResult.meetingId,
      decisions: aiResult.decisions,
    };
  }

  async getActionItems(aiResultId: string, user: AuthenticatedUser) {
    // Returneaza actiunile AI separate. acum.
    const { aiResult, meeting } = await this.getAccessibleAiResult(aiResultId, user);
    const actionItems = await this.actionItemsRepository.findByAiResultId(aiResult.id);

    return {
      aiResultId: aiResult.id,
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      actionItems: actionItems.map((actionItem) => this.withMeeting(actionItem, meeting)),
    };
  }

  async listMeetingActionItems(meetingId: string, user: AuthenticatedUser) {
    // Listeaza actiunile meetingului curent acum.
    const meeting = await this.getAccessibleMeeting(meetingId, user);
    const actionItems = await this.actionItemsRepository.findByMeetingId(
      meeting.id,
      meeting.aiResultId,
    );

    return actionItems.map((actionItem) => this.withMeeting(actionItem, meeting));
  }

  async listActionItems(user: AuthenticatedUser, filters?: { status?: ActionItemStatus }) {
    // Listeaza actiunile accesibile utilizatorului. acum.
    const meetings = await this.findAccessibleMeetings(user);
    const meetingsByAiResultId = new Map(
      meetings
        .filter((meeting) => meeting.aiResultId)
        .map((meeting) => [meeting.aiResultId as string, meeting]),
    );
    const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]));
    const actionItems = await this.actionItemsRepository.findByMeetingIds(
      [...meetingsById.keys()],
      [...meetingsByAiResultId.keys()],
    );
    const filteredActionItems = filters?.status
      ? actionItems.filter((actionItem) => actionItem.status === filters.status)
      : actionItems;

    return filteredActionItems
      .map((actionItem) => {
        const meeting =
          meetingsById.get(actionItem.meetingId ?? '') ??
          meetingsByAiResultId.get(actionItem.aiResultId ?? '');
        return meeting ? this.withMeeting(actionItem, meeting) : undefined;
      })
      .filter((actionItem): actionItem is ActionItemListItem => Boolean(actionItem));
  }

  async createActionItem(
    dto: CreateActionItemDto & { meetingId: string },
    user: AuthenticatedUser,
  ) {
    // Creeaza actiunea manuala meetingului acum.
    const meeting = await this.getManageableMeeting(dto.meetingId, user);
    if (!dto.task?.trim() || !dto.responsiblePerson?.trim()) {
      throw new BadRequestException('Task si responsiblePerson sunt obligatorii.');
    }

    const actionItem = await this.actionItemsRepository.create({
      meetingId: meeting.id,
      task: dto.task.trim(),
      responsiblePerson: dto.responsiblePerson.trim(),
      dueDate: this.parseDueDate(dto.dueDate?.toString()),
      status: dto.status ?? ActionItemStatus.Pending,
    });

    return this.withMeeting(actionItem, meeting);
  }

  async updateActionItem(
    id: string,
    dto: UpdateActionItemDto,
    user: AuthenticatedUser,
  ): Promise<ActionItem> {
    // Actualizeaza actiunea din meeting. acum.
    const actionItem = await this.actionItemsRepository.findOne(id);
    if (!actionItem) {
      throw new NotFoundException(`Action item #${id} not found`);
    }
    await this.resolveActionItemContext(actionItem, user);

    const { dueDate, ...rest } = dto;
    const updated = await this.actionItemsRepository.update(id, {
      ...rest,
      task: rest.task?.trim(),
      responsiblePerson: rest.responsiblePerson?.trim(),
      confidenceScore: this.clampConfidence(rest.confidenceScore),
      ...(dueDate !== undefined ? { dueDate: new Date(dueDate) } : {}),
    });
    if (!updated) {
      throw new NotFoundException(`Action item #${id} not found`);
    }
    return updated;
  }

  async removeActionItem(id: string, user: AuthenticatedUser): Promise<ActionItem> {
    // Sterge actiunea din AI. acum.
    const actionItem = await this.actionItemsRepository.findOne(id);
    if (!actionItem) {
      throw new NotFoundException(`Action item #${id} not found`);
    }
    const { aiResult } = await this.resolveActionItemContext(actionItem, user);

    const removed = await this.actionItemsRepository.remove(id);
    if (!removed) {
      throw new NotFoundException(`Action item #${id} not found`);
    }

    if (aiResult) {
      await this.aiResultsRepository.update(aiResult.id, {
        actionItemIds: aiResult.actionItemIds.filter((actionItemId) => actionItemId !== id),
      });
    }

    return removed;
  }

  private async resolveActionItemContext(
    actionItem: ActionItem,
    user: AuthenticatedUser,
  ): Promise<{ aiResult?: AIResult; meeting: Meeting }> {
    // Verifica accesul la actiune. acum.
    if (actionItem.meetingId) {
      const meeting = await this.getManageableMeeting(actionItem.meetingId, user);
      const aiResult = actionItem.aiResultId
        ? await this.aiResultsRepository.findOne(actionItem.aiResultId)
        : undefined;
      return { aiResult, meeting };
    }

    if (!actionItem.aiResultId) {
      throw new NotFoundException('Action item-ul nu are un meeting asociat.');
    }

    const aiResult = await this.aiResultsRepository.findOne(actionItem.aiResultId);
    if (!aiResult) {
      throw new NotFoundException(`AI result #${actionItem.aiResultId} not found`);
    }

    const meeting = await this.meetingsRepository.findOne(aiResult.meetingId);
    if (!meeting) {
      throw new NotFoundException(`Meeting #${aiResult.meetingId} not found`);
    }

    if (meeting.ownerId?.toString() !== user.userId) {
      throw new ForbiddenException('Doar creatorul meeting-ului poate modifica action items.');
    }

    return { aiResult, meeting };
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
      const aiOutput = await this.generateTranscriptResult(transcript.content, language);

      const aiResult = await this.aiResultsRepository.create({
        meetingId,
        transcriptId: transcript.id,
        summary: aiOutput.summary,
        keyPoints: aiOutput.keyPoints ?? [],
        decisions: aiOutput.decisions ?? [],
        followUpNotes: this.normalizeFollowUpNotes(aiOutput.followUpNotes),
        meetingStatistics: {
          ...aiOutput.meetingStatistics,
          actionItemCount: aiOutput.actionItems?.length ?? 0,
          processingStatus: AiStatus.Completed,
        },
      });

      const actionItems = await Promise.all(
        (aiOutput.actionItems ?? []).map((actionItem) =>
          this.actionItemsRepository.create({
            meetingId,
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

  private async generateTranscriptResult(
    transcript: string,
    language: string,
  ): Promise<AiTranscriptResult> {
    const provider = (process.env.AI_PROVIDER ?? 'auto').toLowerCase();

    if (provider === 'fallback' || provider === 'mock') {
      return this.generateFallbackTranscriptResult(transcript, language);
    }

    try {
      return await this.ollamaService.generateJson<AiTranscriptResult>(
        this.buildPrompt(transcript, language),
      );
    } catch (error) {
      if (provider === 'ollama') {
        throw error;
      }

      console.warn(
        `Ollama is unavailable or returned invalid JSON. Using fallback AI processor. ${
          error instanceof Error ? error.message : ''
        }`,
      );

      return this.generateFallbackTranscriptResult(transcript, language);
    }
  }

  private generateFallbackTranscriptResult(
    transcript: string,
    language: string,
  ): AiTranscriptResult {
    const sentences = this.extractSentences(transcript);
    const actionItems = this.extractFallbackActionItems(transcript) ?? [];
    const isEnglish = language.toLowerCase().startsWith('en');
    const keyPoints = sentences.slice(0, 5);

    return {
      summary: this.buildFallbackSummary(sentences, isEnglish),
      keyPoints: keyPoints.length
        ? keyPoints
        : [
            isEnglish
              ? 'Transcript received for processing.'
              : 'Transcript primit pentru procesare.',
          ],
      decisions: this.extractFallbackDecisions(sentences, isEnglish),
      followUpNotes: isEnglish
        ? 'Generated with the fallback processor because the configured AI provider was unavailable.'
        : 'Generat cu procesorul fallback deoarece providerul AI configurat nu a fost disponibil.',
      meetingStatistics: {
        participantCount: this.extractSpeakerCount(transcript),
        actionItemCount: actionItems.length,
        processingStatus: AiStatus.Completed,
      },
      actionItems,
    };
  }

  private buildFallbackSummary(sentences: string[], isEnglish: boolean): string {
    if (!sentences.length) {
      return isEnglish
        ? 'The transcript was processed, but no clear discussion content was detected.'
        : 'Transcriptul a fost procesat, dar nu a fost detectat continut clar de discutie.';
    }

    const intro = isEnglish
      ? 'Fallback summary based on the transcript:'
      : 'Rezumat fallback pe baza transcriptului:';
    return `${intro} ${sentences.slice(0, 3).join(' ')}`;
  }

  private extractSentences(transcript: string): string[] {
    return transcript
      .replace(/\r/g, '\n')
      .split(/(?<=[.!?])\s+|\n+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 10)
      .slice(0, 20);
  }

  private extractFallbackActionItems(transcript: string): AiTranscriptResult['actionItems'] {
    const actionPatterns =
      /\b(trebuie|de făcut|de facut|voi|o sa|să|sa|please|can you|could you|should|we need|let's|i will|i'll)\b/i;

    return transcript
      .replace(/\r/g, '\n')
      .split(/\n+|(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 8 && actionPatterns.test(line))
      .slice(0, 12)
      .map((line) => ({
        task: this.cleanSpeakerPrefix(line),
        responsiblePerson: this.extractResponsiblePerson(line),
        status: ActionItemStatus.Pending,
        confidenceScore: 0.55,
      }));
  }

  private extractFallbackDecisions(sentences: string[], isEnglish: boolean): string[] {
    const decisionPatterns = /\b(decis|decizie|stabilit|aprobat|agreed|decided|approved)\b/i;
    const decisions = sentences.filter((sentence) => decisionPatterns.test(sentence)).slice(0, 5);

    if (decisions.length) {
      return decisions;
    }

    return [
      isEnglish
        ? 'No explicit decisions were detected by the fallback processor.'
        : 'Nu au fost detectate decizii explicite de procesorul fallback.',
    ];
  }

  private extractSpeakerCount(transcript: string): number | undefined {
    const speakers = new Set<string>();
    for (const line of transcript.split(/\n+/)) {
      const match = line.trim().match(/^([A-ZĂÂÎȘȚA-Z][\wăâîșțĂÂÎȘȚ .'-]{1,40}):/i);
      if (match?.[1]) {
        speakers.add(match[1].trim().toLowerCase());
      }
    }

    return speakers.size || undefined;
  }

  private extractResponsiblePerson(line: string): string {
    const speakerMatch = line.match(/^([^:]{2,40}):/);
    if (speakerMatch?.[1]) {
      return speakerMatch[1].trim();
    }

    return 'Nealocat';
  }

  private cleanSpeakerPrefix(line: string): string {
    return line.replace(/^([^:]{2,40}):\s*/, '').trim();
  }

  private async resolveTranscript(processTranscriptDto: ProcessTranscriptDto) {
    // Alege transcriptul pentru procesare. acum.
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
    // Construieste instructiunile pentru AI. acum.
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
  "followUpNotes": "additional context or next steps to keep in mind for the next meeting, or null if none",
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
  "followUpNotes": "context suplimentar sau pasi urmatori de retinut pentru sedinta viitoare, sau null daca nu exista",
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

  private normalizeFollowUpNotes(notes?: string): string | undefined {
    // Curata notitele de follow-up. acum.
    if (!notes || notes.trim().toLowerCase() === 'null') return undefined;
    return notes.trim();
  }

  private parseDueDate(dueDate?: string): Date | undefined {
    // Converteste deadlineul in data. acum.
    if (!dueDate || dueDate.toLowerCase() === 'null') return undefined;
    const date = new Date(dueDate);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private clampConfidence(confidenceScore?: number): number | undefined {
    // Limiteaza scorul intre zero unu.
    if (confidenceScore === undefined) return undefined;
    return Math.min(1, Math.max(0, confidenceScore));
  }

  private async getAccessibleAiResult(aiResultId: string, user: AuthenticatedUser) {
    // Gaseste rezultatul permis utilizatorului. acum.
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

  private async getAccessibleMeeting(meetingId: string, user: AuthenticatedUser) {
    // Gaseste meetingul permis utilizatorului acum.
    const meeting = await this.meetingsRepository.findOne(meetingId);
    if (!meeting) {
      throw new NotFoundException(`Meeting #${meetingId} not found`);
    }

    await this.assertCanAccessMeeting(meeting, user);
    return meeting;
  }

  private async getManageableMeeting(meetingId: string, user: AuthenticatedUser) {
    // Gaseste meetingul editabil utilizatorului acum.
    const meeting = await this.meetingsRepository.findOne(meetingId);
    if (!meeting) {
      throw new NotFoundException(`Meeting #${meetingId} not found`);
    }

    if (meeting.ownerId?.toString() !== user.userId) {
      throw new ForbiddenException('Doar creatorul meeting-ului poate modifica action items.');
    }

    return meeting;
  }

  private async findAccessibleMeetings(user: AuthenticatedUser): Promise<Meeting[]> {
    // Gaseste meetingurile permise utilizatorului. acum.
    const invitations = await this.invitationsRepository.findByParticipantEmail(user.email);
    return this.meetingsRepository.findAccessible(
      user.userId,
      invitations.map((invitation) => invitation.meetingId),
    );
  }

  private withMeeting(actionItem: ActionItem, meeting: Meeting): ActionItemListItem {
    // Adauga contextul meetingului actiunii. acum.
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
    // Permite creatorului sau invitatului. acum.
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
