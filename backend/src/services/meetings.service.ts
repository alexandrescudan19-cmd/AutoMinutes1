import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddMeetingInvitationsDto } from '../dto/meetings/add-meeting-invitations.dto';
import { UpdateAttendeeDto } from '../dto/attendees/update-attendee.dto';
import { CreateMeetingDto, CreateMeetingParticipantDto } from '../dto/meetings/create-meeting.dto';
import {
  MeetingHistoryQueryDto,
  MeetingHistorySort,
} from '../dto/meetings/meeting-history-query.dto';
import { UpdateMeetingDto } from '../dto/meetings/update-meeting.dto';
import { AttendanceStatus } from '../models/attendee.schema';
import { Invitation } from '../models/invitation.schema';
import { AiStatus, Meeting, MeetingStatus } from '../models/meeting.schema';
import { Notification } from '../models/notification.schema';
import { AttendeesRepository } from '../repositories/attendees.repository';
import { ActionItemsRepository } from '../repositories/action-items.repository';
import { AiResultsRepository } from '../repositories/ai-results.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { TranscriptsRepository } from '../repositories/transcripts.repository';
import { UsersRepository } from '../repositories/users.repository';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleMeetTranscriptService } from './google-meet-transcript.service';
import { EncryptionService } from './encryption.service';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export type MeetingHistoryItem = Meeting & {
  actionItemsCount: number;
};

export type TranscriptVersionItem = {
  id: string;
  meetingId: string;
  content: string;
  fileFormat: string;
  uploadedAt?: string | Date;
  createdAt?: string;
  updatedAt?: string;
  version: number;
  isCurrent: boolean;
};

export type RestoreTranscriptVersionResult = {
  meeting: Meeting;
  transcript: TranscriptVersionItem;
  aiResultId?: string;
};

// Tip pentru participantii invitabili folositi.
type NormalizedParticipant = {
  name: string;
  email: string;
  roleInMeeting: string;
};

@Injectable()
export class MeetingsService {
  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly attendeesRepository: AttendeesRepository,
    private readonly invitationsRepository: InvitationsRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly transcriptsRepository: TranscriptsRepository,
    private readonly googleMeetTranscriptService: GoogleMeetTranscriptService,
    private readonly aiResultsRepository: AiResultsRepository,
    private readonly actionItemsRepository: ActionItemsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(createMeetingDto: CreateMeetingDto, user?: AuthenticatedUser): Promise<Meeting> {
    // Creeaza meetingul si invitatiile asociate.
    const startDateTime = new Date(createMeetingDto.startDateTime);
    const endDateTime = new Date(createMeetingDto.endDateTime);
    const ownerId = user?.userId ?? createMeetingDto.ownerId;
    const participants = this.normalizeParticipants(createMeetingDto.participants);

    const existingAttendees = (
      await Promise.all(
        (createMeetingDto.attendeeIds ?? []).map((id) => this.attendeesRepository.findOne(id)),
      )
    ).filter((attendee): attendee is NonNullable<typeof attendee> => Boolean(attendee));

    const allParticipants = this.normalizeParticipants([
      ...participants,
      ...existingAttendees.map((attendee) => ({
        name: attendee.name,
        email: attendee.email,
        roleInMeeting: attendee.roleInMeeting,
      })),
    ]);

    let googleCalendarEventId = createMeetingDto.googleCalendarEventId;
    let googleMeetLink = createMeetingDto.googleMeetLink;

    if (createMeetingDto.createGoogleCalendarEvent) {
      const refreshToken = await this.getOwnerRefreshToken(ownerId);
      const calendarEvent = await this.googleCalendarService.createEvent(
        {
          title: createMeetingDto.title,
          description: createMeetingDto.description,
          startDateTime,
          endDateTime,
          attendees: allParticipants,
        },
        refreshToken,
      );

      googleCalendarEventId = calendarEvent.eventId;
      googleMeetLink = calendarEvent.meetLink;
    }

    const meeting = await this.meetingsRepository.create({
      ...createMeetingDto,
      ownerId,
      startDateTime,
      endDateTime,
      googleCalendarEventId,
      googleMeetLink,
      attendeeIds: createMeetingDto.attendeeIds ?? [],
      invitationIds: createMeetingDto.invitationIds ?? [],
      notificationIds: createMeetingDto.notificationIds ?? [],
    });

    const attendees = await Promise.all(
      participants.map((participant) =>
        this.attendeesRepository.create({
          name: participant.name,
          email: participant.email,
          roleInMeeting: participant.roleInMeeting ?? 'Participant',
          attendanceStatus: AttendanceStatus.Invited,
        }),
      ),
    );

    // Adauga creatorul ca organizator automat.
    const ownerUser = await this.usersRepository.findOne(ownerId);
    const organizerAttendee = ownerUser
      ? await this.attendeesRepository.create({
          name: `${ownerUser.firstName} ${ownerUser.lastName}`.trim() || ownerUser.email,
          email: ownerUser.email,
          roleInMeeting: 'Organizer',
          attendanceStatus: AttendanceStatus.Accepted,
        })
      : undefined;

    const shouldSendInvitations = createMeetingDto.sendInAppInvitations ?? true;
    const invitations = shouldSendInvitations
      ? await Promise.all(
          allParticipants.map((participant) =>
            this.invitationsRepository.create({
              meetingId: meeting.id,
              participantEmail: participant.email,
              invitationStatus: AttendanceStatus.Invited,
            }),
          ),
        )
      : [];

    const notifications = shouldSendInvitations
      ? await Promise.all(
          allParticipants.map((participant) =>
            this.notificationsRepository.create({
              title: `Invitatie la ${meeting.title}`,
              message: this.buildInvitationMessage(meeting, googleMeetLink),
              type: 'meeting-invitation',
              recipientEmail: participant.email,
              meetingId: meeting.id,
              isRead: false,
            }),
          ),
        )
      : [];

    const updatedMeeting = await this.meetingsRepository.update(meeting.id, {
      attendeeIds: [
        ...(organizerAttendee ? [organizerAttendee.id] : []),
        ...(createMeetingDto.attendeeIds ?? []),
        ...attendees.map((attendee) => attendee.id),
      ],
      invitationIds: [
        ...(createMeetingDto.invitationIds ?? []),
        ...invitations.map((invitation) => invitation.id),
      ],
      notificationIds: [
        ...(createMeetingDto.notificationIds ?? []),
        ...notifications.map((notification) => notification.id),
      ],
      transcriptId: createMeetingDto.transcriptId,
    });

    return updatedMeeting ?? meeting;
  }

  async findAll(user?: AuthenticatedUser): Promise<Meeting[]> {
    // Listeaza meetingurile permise utilizatorului. acum.
    await this.meetingsRepository.completeFinishedMeetings();
    return this.findAccessibleMeetings(user);
  }

  async findHistory(user: AuthenticatedUser, query: MeetingHistoryQueryDto) {
    // Pregateste history filtrat si paginat.
    await this.meetingsRepository.completeFinishedMeetings();

    const page = this.toPositiveInt(query.page, 1);
    const pageSize = Math.min(this.toPositiveInt(query.pageSize, 5), 50);
    const search = query.search?.trim().toLowerCase();
    const sort = query.sort ?? 'newest';

    const meetings = await this.findAccessibleMeetings(user);
    const filteredMeetings = this.filterMeetings(meetings, {
      search,
      status: query.status,
      aiStatus: query.aiStatus,
    });
    const sortedMeetings = this.sortMeetings(filteredMeetings, sort);
    const total = sortedMeetings.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);

    // Calculeaza statisticile complete filtrate acum.
    const annotatedMeetings = await this.withActionItemsCount(sortedMeetings);
    const items = annotatedMeetings.slice((safePage - 1) * pageSize, safePage * pageSize);

    const stats = {
      total,
      processing: filteredMeetings.filter((meeting) => meeting.aiStatus === AiStatus.Processing)
        .length,
      completed: filteredMeetings.filter((meeting) => meeting.aiStatus === AiStatus.Completed)
        .length,
      openActionItems: annotatedMeetings.reduce(
        (sum, meeting) => sum + meeting.actionItemsCount,
        0,
      ),
    };

    return {
      items,
      total,
      page: safePage,
      pageSize,
      pageCount,
      stats,
    };
  }

  async findOne(id: string, user?: AuthenticatedUser): Promise<Meeting> {
    // Returneaza meetingul accesibil cerut. acum.
    await this.meetingsRepository.completeFinishedMeetings();
    const meeting = await this.meetingsRepository.findOne(id);
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    if (user) {
      await this.assertCanAccessMeeting(meeting, user);
    }
    return meeting;
  }

  async update(
    id: string,
    updateMeetingDto: UpdateMeetingDto,
    user?: AuthenticatedUser,
  ): Promise<Meeting> {
    // Actualizeaza meetingul detinut de utilizator.
    if (user) {
      await this.assertCanManageMeeting(id, user);
    }

    const meeting = await this.meetingsRepository.update(id, {
      ...updateMeetingDto,
      startDateTime: updateMeetingDto.startDateTime
        ? new Date(updateMeetingDto.startDateTime)
        : undefined,
      endDateTime: updateMeetingDto.endDateTime
        ? new Date(updateMeetingDto.endDateTime)
        : undefined,
    });
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    return meeting;
  }

  async remove(id: string, user?: AuthenticatedUser): Promise<Meeting> {
    // Sterge meetingul detinut de utilizator.
    if (user) {
      await this.assertCanManageMeeting(id, user);
    }

    const meeting = await this.meetingsRepository.remove(id);
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    return meeting;
  }

  async importMeetTranscript(id: string, user?: AuthenticatedUser) {
    // Importa transcriptul pentru meeting. acum.
    await this.meetingsRepository.completeFinishedMeetings();
    const meeting = await this.findOne(id, user);
    if (user) {
      await this.assertCanManageMeeting(id, user);
    }
    if (!meeting.googleMeetLink) {
      throw new NotFoundException('Meeting-ul nu are Google Meet link salvat.');
    }

    return this.importTranscriptForMeeting(meeting);
  }

  async importMissingFinishedTranscripts(limit = 10) {
    // Importa transcripturi finalizate lipsa. acum.
    await this.meetingsRepository.completeFinishedMeetings();
    const meetings = await this.meetingsRepository.findFinishedWithoutTranscript(new Date(), limit);
    const results: Array<{ meetingId: string; imported: boolean; error?: string }> = [];

    for (const meeting of meetings) {
      try {
        await this.importTranscriptForMeeting(meeting);
        results.push({ meetingId: meeting.id, imported: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown import error';
        results.push({ meetingId: meeting.id, imported: false, error: message });
      }
    }

    return results;
  }

  private async importTranscriptForMeeting(meeting: Meeting) {
    // Salveaza transcriptul importat automat. acum.
    if (!meeting.googleMeetLink) {
      throw new NotFoundException('Meeting-ul nu are Google Meet link salvat.');
    }

    const refreshToken = await this.getOwnerRefreshToken(meeting.ownerId);
    const importedTranscript = await this.googleMeetTranscriptService.importTranscriptByMeetLink(
      meeting.googleMeetLink,
      refreshToken,
    );

    const transcript = await this.transcriptsRepository.create({
      meetingId: meeting.id,
      content: importedTranscript.content,
      fileFormat: 'google-meet-transcript',
    });

    const updatedMeeting = await this.meetingsRepository.update(meeting.id, {
      transcriptId: transcript.id,
    });

    return {
      meeting: updatedMeeting ?? meeting,
      transcript,
      source: {
        conferenceRecordName: importedTranscript.conferenceRecordName,
        transcriptName: importedTranscript.transcriptName,
        entriesCount: importedTranscript.entriesCount,
        languageCode: importedTranscript.languageCode,
      },
    };
  }

  async addInvitations(
    id: string,
    addMeetingInvitationsDto: AddMeetingInvitationsDto,
    user: AuthenticatedUser,
  ) {
    // Adauga invitatii noi meetingului. acum.
    await this.meetingsRepository.completeFinishedMeetings();
    await this.assertCanManageMeeting(id, user);

    const meeting = await this.findOne(id, user);

    const submittedParticipants = (addMeetingInvitationsDto.participants ?? [])
      .filter((participant) => participant.name?.trim())
      .map((participant) => ({
        name: participant.name.trim(),
        email: participant.email?.trim().toLowerCase() || undefined,
        roleInMeeting: participant.roleInMeeting?.trim() || 'Participant',
      }));

    if (submittedParticipants.length === 0) {
      throw new BadRequestException('Adauga cel putin un participant valid.');
    }

    const existingInvitations = await this.invitationsRepository.findByMeetingId(meeting.id);
    const existingEmails = new Set(
      existingInvitations.map((invitation) => invitation.participantEmail.toLowerCase().trim()),
    );

    // Evita invitatii duplicate prin email.
    const newParticipants = submittedParticipants.filter(
      (participant) => !participant.email || !existingEmails.has(participant.email),
    );

    if (newParticipants.length === 0) {
      throw new BadRequestException('Participantii sunt deja invitati la acest meeting.');
    }

    const invitableParticipants = newParticipants.filter(
      (participant): participant is typeof participant & { email: string } => !!participant.email,
    );

    // Blocheaza invitatii dupa finalizarea meetingului.
    if (
      invitableParticipants.length > 0 &&
      [MeetingStatus.Completed, MeetingStatus.Cancelled].includes(meeting.status)
    ) {
      throw new BadRequestException('Nu poti trimite invitatii noi pentru un meeting incheiat.');
    }

    if (meeting.googleCalendarEventId && invitableParticipants.length > 0) {
      const refreshToken = await this.getOwnerRefreshToken(meeting.ownerId);
      await this.googleCalendarService.addAttendees(
        meeting.googleCalendarEventId,
        invitableParticipants,
        refreshToken,
      );
    }

    const attendees = await Promise.all(
      newParticipants.map((participant) =>
        this.attendeesRepository.create({
          name: participant.name,
          email: participant.email,
          roleInMeeting: participant.roleInMeeting,
          attendanceStatus: AttendanceStatus.Invited,
        }),
      ),
    );
    const invitations = await Promise.all(
      invitableParticipants.map((participant) =>
        this.invitationsRepository.create({
          meetingId: meeting.id,
          participantEmail: participant.email,
          invitationStatus: AttendanceStatus.Invited,
        }),
      ),
    );
    const notifications = await Promise.all(
      invitableParticipants.map((participant) =>
        this.notificationsRepository.create({
          title: `Invitatie la ${meeting.title}`,
          message: this.buildInvitationMessage(meeting, meeting.googleMeetLink),
          type: 'meeting-invitation',
          recipientEmail: participant.email,
          meetingId: meeting.id,
          isRead: false,
        }),
      ),
    );

    const updatedMeeting = await this.meetingsRepository.update(meeting.id, {
      attendeeIds: [...(meeting.attendeeIds ?? []), ...attendees.map((attendee) => attendee.id)],
      invitationIds: [
        ...(meeting.invitationIds ?? []),
        ...invitations.map((invitation) => invitation.id),
      ],
      notificationIds: [
        ...(meeting.notificationIds ?? []),
        ...notifications.map((notification) => notification.id),
      ],
    });

    return {
      meeting: updatedMeeting ?? meeting,
      attendees,
      invitations,
      notifications,
      skippedEmails: submittedParticipants
        .filter((participant) => participant.email && existingEmails.has(participant.email))
        .map((participant) => participant.email as string),
    };
  }

  async findAttendeesForMeeting(id: string, user: AuthenticatedUser) {
    // Listeaza participantii meetingului accesibil. acum.
    const meeting = await this.findOne(id, user);

    return Promise.all(
      (meeting.attendeeIds ?? []).map(async (attendeeId) => {
        const attendee = await this.attendeesRepository.findOne(attendeeId);
        return attendee;
      }),
    ).then((attendees) => attendees.filter(Boolean));
  }

  async updateAttendeeForMeeting(
    meetingId: string,
    attendeeId: string,
    updateAttendeeDto: UpdateAttendeeDto,
    user: AuthenticatedUser,
  ) {
    // Actualizeaza participantul unui meeting. acum.
    const meeting = await this.findOne(meetingId, user);
    await this.assertCanManageMeeting(meetingId, user);

    if (!meeting.attendeeIds?.some((id) => id.toString() === attendeeId)) {
      throw new NotFoundException(`Attendee #${attendeeId} not found for meeting #${meetingId}`);
    }

    const attendee = await this.attendeesRepository.update(attendeeId, {
      ...updateAttendeeDto,
      email: updateAttendeeDto.email?.toLowerCase().trim(),
      name: updateAttendeeDto.name?.trim(),
      roleInMeeting: updateAttendeeDto.roleInMeeting?.trim(),
    });

    if (!attendee) {
      throw new NotFoundException(`Attendee #${attendeeId} not found`);
    }

    return attendee;
  }

  async removeAttendee(
    meetingId: string,
    attendeeId: string,
    user: AuthenticatedUser,
  ): Promise<Meeting> {
    // Elimina participantul din meeting. acum.
    await this.assertCanManageMeeting(meetingId, user);

    const meeting = await this.meetingsRepository.findOne(meetingId);
    if (!meeting) {
      throw new NotFoundException(`Meeting #${meetingId} not found`);
    }

    await this.attendeesRepository.remove(attendeeId);

    const updatedMeeting = await this.meetingsRepository.update(meetingId, {
      attendeeIds: (meeting.attendeeIds ?? []).filter((id) => id.toString() !== attendeeId),
    });

    return updatedMeeting ?? meeting;
  }

  findInvitationsByEmail(email: string, user?: AuthenticatedUser): Promise<Invitation[]> {
    // Listeaza invitatiile emailului curent. acum.
    this.assertOwnEmail(email, user);
    return this.invitationsRepository.findByParticipantEmail(user?.email ?? email);
  }

  findNotificationsByEmail(email: string, user?: AuthenticatedUser): Promise<Notification[]> {
    // Listeaza notificarile emailului curent. acum.
    this.assertOwnEmail(email, user);
    return this.notificationsRepository.findByRecipientEmail(user?.email ?? email);
  }

  async findTranscriptForMeetingUser(transcriptId: string, user: AuthenticatedUser) {
    // Returneaza transcriptul cu acces. acum.
    const transcript = await this.transcriptsRepository.findOne(transcriptId);
    if (!transcript) {
      throw new NotFoundException(`Transcript #${transcriptId} not found`);
    }

    await this.findOne(transcript.meetingId, user);
    return transcript;
  }

  async findTranscriptVersions(meetingId: string, user: AuthenticatedUser) {
    // Listeaza versiunile transcriptului meetingului. acum.
    const meeting = await this.findOne(meetingId, user);
    const transcripts = await this.transcriptsRepository.findByMeetingId(meetingId);

    // Marcheaza versiunea activa curenta acum.
    return transcripts.map((transcript, index): TranscriptVersionItem => ({
      ...transcript,
      version: index + 1,
      isCurrent: transcript.id === meeting.transcriptId?.toString(),
    }));
  }

  async restoreTranscriptVersion(
    meetingId: string,
    transcriptId: string,
    user: AuthenticatedUser,
  ): Promise<RestoreTranscriptVersionResult> {
    // Restaureaza versiunea de transcript. acum.
    const meeting = await this.findOne(meetingId, user);
    const transcript = await this.transcriptsRepository.findOne(transcriptId);
    if (!transcript || transcript.meetingId.toString() !== meetingId) {
      throw new NotFoundException(`Transcript #${transcriptId} not found for this meeting`);
    }

    const aiResult = await this.aiResultsRepository.findLatestByTranscriptId(transcriptId);

    // Leaga rezultatul AI de transcript.
    const updatedMeeting = await this.meetingsRepository.update(meetingId, {
      transcriptId,
      aiResultId: aiResult?.id ?? '',
      aiStatus: aiResult ? AiStatus.Completed : AiStatus.Idle,
    });

    // Recalculeaza numarul versiunii restaurate acum.
    const versions = await this.transcriptsRepository.findByMeetingId(meetingId);
    const restoredIndex = versions.findIndex((version) => version.id === transcriptId);

    return {
      meeting: updatedMeeting ?? meeting,
      transcript: {
        ...transcript,
        version: restoredIndex >= 0 ? restoredIndex + 1 : versions.length,
        isCurrent: true,
      },
      aiResultId: aiResult?.id,
    };
  }

  private normalizeParticipants(
    participants: CreateMeetingParticipantDto[] = [],
  ): NormalizedParticipant[] {
    // Normalizeaza participantii cu email valid.
    return participants
      .filter(
        (participant): participant is CreateMeetingParticipantDto & { email: string } =>
          !!participant.email?.trim(),
      )
      .map((participant) => ({
        name: participant.name?.trim() || participant.email.trim(),
        email: participant.email.toLowerCase().trim(),
        roleInMeeting: participant.roleInMeeting?.trim() || 'Participant',
      }));
  }

  private buildInvitationMessage(meeting: Meeting, googleMeetLink?: string): string {
    // Compune mesajul invitatiei interne. acum.
    const start = new Date(meeting.startDateTime).toLocaleString('ro-RO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return googleMeetLink
      ? `Ai fost invitat la sedinta "${meeting.title}" pe ${start}. Link Meet: ${googleMeetLink}`
      : `Ai fost invitat la sedinta "${meeting.title}" pe ${start}.`;
  }

  private async findAccessibleMeetings(user?: AuthenticatedUser): Promise<Meeting[]> {
    // Gaseste meetingurile permise utilizatorului. acum.
    if (!user) {
      return this.meetingsRepository.findAll();
    }

    const invitations = await this.invitationsRepository.findByParticipantEmail(user.email);
    return this.meetingsRepository.findAccessible(
      user.userId,
      invitations.map((invitation) => invitation.meetingId),
    );
  }

  private filterMeetings(
    meetings: Meeting[],
    filters: { search?: string; status?: MeetingStatus; aiStatus?: AiStatus },
  ) {
    // Filtreaza meetingurile dupa criterii. acum.
    return meetings.filter((meeting) => {
      if (filters.status && meeting.status !== filters.status) {
        return false;
      }

      if (filters.aiStatus && meeting.aiStatus !== filters.aiStatus) {
        return false;
      }

      if (!filters.search) {
        return true;
      }

      return [
        meeting.id,
        meeting.title,
        meeting.description,
        meeting.status,
        meeting.aiStatus,
        meeting.transcriptId,
        meeting.googleMeetLink,
        new Date(meeting.startDateTime).toLocaleString('ro-RO'),
        new Date(meeting.endDateTime).toLocaleString('ro-RO'),
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(filters.search as string));
    });
  }

  private sortMeetings(meetings: Meeting[], sort: MeetingHistorySort) {
    // Sorteaza meetingurile pentru history. acum.
    const statusOrder: Record<string, number> = {
      [MeetingStatus.InProgress]: 0,
      [MeetingStatus.Upcoming]: 1,
      [MeetingStatus.Completed]: 2,
      [MeetingStatus.Cancelled]: 3,
    };

    return [...meetings].sort((left, right) => {
      if (sort === 'title') {
        return left.title.localeCompare(right.title);
      }

      if (sort === 'status') {
        const statusDiff = (statusOrder[left.status] ?? 99) - (statusOrder[right.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
      }

      const leftTime = new Date(left.startDateTime).getTime();
      const rightTime = new Date(right.startDateTime).getTime();
      return sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
    });
  }

  private async withActionItemsCount(meetings: Meeting[]): Promise<MeetingHistoryItem[]> {
    // Adauga numarul de actiuni. acum.
    return Promise.all(
      meetings.map(async (meeting) => {
        const actionItems = await this.actionItemsRepository.findByMeetingId(
          meeting.id,
          meeting.aiResultId,
        );
        return {
          ...meeting,
          actionItemsCount: actionItems.length,
        };
      }),
    );
  }

  private toPositiveInt(raw: string | undefined, fallback: number) {
    // Parseaza numere pozitive sigure. acum.
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private async assertCanAccessMeeting(meeting: Meeting, user: AuthenticatedUser): Promise<void> {
    // Permite creatorului sau invitatului. acum.
    if (meeting.ownerId?.toString() === user.userId) {
      return;
    }

    const invitations = await this.invitationsRepository.findByParticipantEmail(user.email);
    const isInvited = invitations.some(
      (invitation) => invitation.meetingId.toString() === meeting.id,
    );
    if (!isInvited) {
      throw new ForbiddenException('Nu ai acces la acest meeting.');
    }
  }

  private async assertCanManageMeeting(id: string, user: AuthenticatedUser): Promise<void> {
    // Permite doar creatorului modificari. acum.
    const meeting = await this.meetingsRepository.findOne(id);
    if (!meeting) {
      throw new NotFoundException(`Meeting #${id} not found`);
    }
    if (meeting.ownerId?.toString() !== user.userId) {
      throw new ForbiddenException('Doar creatorul meeting-ului poate modifica aceasta resursa.');
    }
  }

  private async getOwnerRefreshToken(ownerId: string): Promise<string> {
    // Decripteaza tokenul Google salvat. acum.
    const owner = ownerId ? await this.usersRepository.findOne(ownerId) : undefined;
    if (!owner?.googleRefreshTokenEncrypted) {
      throw new BadRequestException(
        'Trebuie să conectezi contul Google din Setări înainte de a crea o întâlnire cu Google Meet.',
      );
    }

    return this.encryptionService.decrypt(owner.googleRefreshTokenEncrypted);
  }

  private assertOwnEmail(email: string, user?: AuthenticatedUser): void {
    // Blocheaza citirea altui email. acum.
    if (!user) {
      return;
    }

    if (email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      throw new ForbiddenException('Nu poti vedea datele altui utilizator.');
    }
  }
}
