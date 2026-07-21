import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateMeetingDto, CreateMeetingParticipantDto } from '../dto/meetings/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/meetings/update-meeting.dto';
import { AttendanceStatus } from '../models/attendee.schema';
import { Invitation } from '../models/invitation.schema';
import { Meeting } from '../models/meeting.schema';
import { Notification } from '../models/notification.schema';
import { AttendeesRepository } from '../repositories/attendees.repository';
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
    if (user) {
      const invitations = await this.invitationsRepository.findByParticipantEmail(user.email);
      return this.meetingsRepository.findAccessible(
        user.userId,
        invitations.map((invitation) => invitation.meetingId),
      );
    }
    return this.meetingsRepository.findAll();
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
