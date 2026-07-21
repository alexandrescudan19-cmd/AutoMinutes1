import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AddMeetingInvitationsDto } from '../dto/meetings/add-meeting-invitations.dto';
import { CreateMeetingDto, CreateMeetingParticipantDto } from '../dto/meetings/create-meeting.dto';
import {
  MeetingHistoryQueryDto,
  MeetingHistorySort,
} from '../dto/meetings/meeting-history-query.dto';
import { UpdateMeetingDto } from '../dto/meetings/update-meeting.dto';
import { AttendanceStatus } from '../models/attendee.schema';
import { Invitation } from '../models/invitation.schema';
import { Meeting, MeetingStatus } from '../models/meeting.schema';
import { Notification } from '../models/notification.schema';
import { AttendeesRepository } from '../repositories/attendees.repository';
import { AiResultsRepository } from '../repositories/ai-results.repository';
import { InvitationsRepository } from '../repositories/invitations.repository';
import { MeetingsRepository } from '../repositories/meetings.repository';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { TranscriptsRepository } from '../repositories/transcripts.repository';
import { GoogleCalendarService } from './google-calendar.service';
import { GoogleMeetTranscriptService } from './google-meet-transcript.service';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: string;
}

export type MeetingHistoryItem = Meeting & {
  actionItemsCount: number;
};

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly meetingsRepository: MeetingsRepository,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly attendeesRepository: AttendeesRepository,
    private readonly invitationsRepository: InvitationsRepository,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly transcriptsRepository: TranscriptsRepository,
    private readonly googleMeetTranscriptService: GoogleMeetTranscriptService,
    private readonly aiResultsRepository: AiResultsRepository,
  ) {}

  async create(createMeetingDto: CreateMeetingDto, user?: AuthenticatedUser): Promise<Meeting> {
    const startDateTime = new Date(createMeetingDto.startDateTime);
    const endDateTime = new Date(createMeetingDto.endDateTime);
    const participants = this.normalizeParticipants(createMeetingDto.participants);

    let googleCalendarEventId = createMeetingDto.googleCalendarEventId;
    let googleMeetLink = createMeetingDto.googleMeetLink;

    if (createMeetingDto.createGoogleCalendarEvent) {
      const calendarEvent = await this.googleCalendarService.createEvent({
        title: createMeetingDto.title,
        description: createMeetingDto.description,
        startDateTime,
        endDateTime,
        attendees: participants,
      });

      googleCalendarEventId = calendarEvent.eventId;
      googleMeetLink = calendarEvent.meetLink;
    }

    const meeting = await this.meetingsRepository.create({
      ...createMeetingDto,
      ownerId: user?.userId ?? createMeetingDto.ownerId,
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

    const shouldSendInvitations = createMeetingDto.sendInAppInvitations ?? true;
    const invitations = shouldSendInvitations
      ? await Promise.all(
          participants.map((participant) =>
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
          participants.map((participant) =>
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
    await this.meetingsRepository.completeFinishedMeetings();
    return this.findAccessibleMeetings(user);
  }

  async findHistory(user: AuthenticatedUser, query: MeetingHistoryQueryDto) {
    await this.meetingsRepository.completeFinishedMeetings();

    const page = this.toPositiveInt(query.page, 1);
    const pageSize = Math.min(this.toPositiveInt(query.pageSize, 5), 50);
    const search = query.search?.trim().toLowerCase();
    const sort = query.sort ?? 'newest';

    const meetings = await this.findAccessibleMeetings(user);
    const filteredMeetings = this.filterMeetings(meetings, search);
    const sortedMeetings = this.sortMeetings(filteredMeetings, sort);
    const total = sortedMeetings.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, pageCount);
    const pageItems = sortedMeetings.slice((safePage - 1) * pageSize, safePage * pageSize);
    const items = await this.withActionItemsCount(pageItems);

    return {
      items,
      total,
      page: safePage,
      pageSize,
      pageCount,
    };
  }

  async findOne(id: string, user?: AuthenticatedUser): Promise<Meeting> {
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
    if (user) {
      await this.assertCanManageMeeting(id, user);
    }

    const meeting = await this.meetingsRepository.remove(id);
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    return meeting;
  }

  async importMeetTranscript(id: string, user?: AuthenticatedUser) {
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
    await this.meetingsRepository.completeFinishedMeetings();
    const meetings = await this.meetingsRepository.findFinishedWithoutTranscript(new Date(), limit);
    const results: Array<{ meetingId: string; imported: boolean; error?: string }> = [];

    for (const meeting of meetings) {
      try {
        await this.importTranscriptForMeeting(meeting);
        results.push({ meetingId: meeting.id, imported: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown import error';
        this.logger.debug(`Transcript not ready for meeting ${meeting.id}: ${message}`);
        results.push({ meetingId: meeting.id, imported: false, error: message });
      }
    }

    return results;
  }

  private async importTranscriptForMeeting(meeting: Meeting) {
    if (!meeting.googleMeetLink) {
      throw new NotFoundException('Meeting-ul nu are Google Meet link salvat.');
    }

    const importedTranscript = await this.googleMeetTranscriptService.importTranscriptByMeetLink(
      meeting.googleMeetLink,
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
    await this.meetingsRepository.completeFinishedMeetings();
    await this.assertCanManageMeeting(id, user);

    const meeting = await this.findOne(id, user);
    if ([MeetingStatus.Completed, MeetingStatus.Cancelled].includes(meeting.status)) {
      throw new BadRequestException('Nu poti trimite invitatii noi pentru un meeting incheiat.');
    }

    const participants = this.normalizeParticipants(addMeetingInvitationsDto.participants);
    if (participants.length === 0) {
      throw new BadRequestException('Adauga cel putin un participant valid.');
    }

    const existingInvitations = await this.invitationsRepository.findByMeetingId(meeting.id);
    const existingEmails = new Set(
      existingInvitations.map((invitation) => invitation.participantEmail.toLowerCase().trim()),
    );
    const newParticipants = participants.filter(
      (participant) => !existingEmails.has(participant.email),
    );

    if (newParticipants.length === 0) {
      throw new BadRequestException('Participantii sunt deja invitati la acest meeting.');
    }

    if (meeting.googleCalendarEventId) {
      await this.googleCalendarService.addAttendees(meeting.googleCalendarEventId, newParticipants);
    }

    const attendees = await Promise.all(
      newParticipants.map((participant) =>
        this.attendeesRepository.create({
          name: participant.name,
          email: participant.email,
          roleInMeeting: participant.roleInMeeting ?? 'Participant',
          attendanceStatus: AttendanceStatus.Invited,
        }),
      ),
    );
    const invitations = await Promise.all(
      newParticipants.map((participant) =>
        this.invitationsRepository.create({
          meetingId: meeting.id,
          participantEmail: participant.email,
          invitationStatus: AttendanceStatus.Invited,
        }),
      ),
    );
    const notifications = await Promise.all(
      newParticipants.map((participant) =>
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
      skippedEmails: participants
        .filter((participant) => existingEmails.has(participant.email))
        .map((participant) => participant.email),
    };
  }

  findInvitationsByEmail(email: string, user?: AuthenticatedUser): Promise<Invitation[]> {
    this.assertOwnEmail(email, user);
    return this.invitationsRepository.findByParticipantEmail(user?.email ?? email);
  }

  findNotificationsByEmail(email: string, user?: AuthenticatedUser): Promise<Notification[]> {
    this.assertOwnEmail(email, user);
    return this.notificationsRepository.findByRecipientEmail(user?.email ?? email);
  }

  async findTranscriptForMeetingUser(transcriptId: string, user: AuthenticatedUser) {
    const transcript = await this.transcriptsRepository.findOne(transcriptId);
    if (!transcript) {
      throw new NotFoundException(`Transcript #${transcriptId} not found`);
    }

    await this.findOne(transcript.meetingId, user);
    return transcript;
  }

  private normalizeParticipants(
    participants: CreateMeetingParticipantDto[] = [],
  ): CreateMeetingParticipantDto[] {
    return participants
      .filter((participant) => participant.email?.trim())
      .map((participant) => ({
        ...participant,
        name: participant.name?.trim() || participant.email.trim(),
        email: participant.email.toLowerCase().trim(),
        roleInMeeting: participant.roleInMeeting?.trim() || 'Participant',
      }));
  }

  private buildInvitationMessage(meeting: Meeting, googleMeetLink?: string): string {
    const start = new Date(meeting.startDateTime).toLocaleString('ro-RO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    return googleMeetLink
      ? `Ai fost invitat la sedinta "${meeting.title}" pe ${start}. Link Meet: ${googleMeetLink}`
      : `Ai fost invitat la sedinta "${meeting.title}" pe ${start}.`;
  }

  private async findAccessibleMeetings(user?: AuthenticatedUser): Promise<Meeting[]> {
    if (!user) {
      return this.meetingsRepository.findAll();
    }

    const invitations = await this.invitationsRepository.findByParticipantEmail(user.email);
    return this.meetingsRepository.findAccessible(
      user.userId,
      invitations.map((invitation) => invitation.meetingId),
    );
  }

  private filterMeetings(meetings: Meeting[], search?: string) {
    if (!search) {
      return meetings;
    }

    return meetings.filter((meeting) =>
      [
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
        .some((value) => value?.toLowerCase().includes(search)),
    );
  }

  private sortMeetings(meetings: Meeting[], sort: MeetingHistorySort) {
    const statusOrder: Record<string, number> = {
      [MeetingStatus.InProgress]: 0,
      [MeetingStatus.Upcoming]: 1,
      [MeetingStatus.Completed]: 2,
      [MeetingStatus.Cancelled]: 3,
    };

    return [...meetings].sort((left, right) => {
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
    return Promise.all(
      meetings.map(async (meeting) => {
        if (!meeting.aiResultId) {
          return { ...meeting, actionItemsCount: 0 };
        }

        const aiResult = await this.aiResultsRepository.findOne(meeting.aiResultId);
        return {
          ...meeting,
          actionItemsCount:
            aiResult?.meetingStatistics?.actionItemCount ?? aiResult?.actionItemIds?.length ?? 0,
        };
      }),
    );
  }

  private toPositiveInt(raw: string | undefined, fallback: number) {
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  private async assertCanAccessMeeting(meeting: Meeting, user: AuthenticatedUser): Promise<void> {
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
    const meeting = await this.meetingsRepository.findOne(id);
    if (!meeting) {
      throw new NotFoundException(`Meeting #${id} not found`);
    }
    if (meeting.ownerId?.toString() !== user.userId) {
      throw new ForbiddenException('Doar creatorul meeting-ului poate modifica aceasta resursa.');
    }
  }

  private assertOwnEmail(email: string, user?: AuthenticatedUser): void {
    if (!user) {
      return;
    }

    if (email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
      throw new ForbiddenException('Nu poti vedea datele altui utilizator.');
    }
  }
}
