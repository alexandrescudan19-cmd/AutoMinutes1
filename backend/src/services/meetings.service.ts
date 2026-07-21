import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateMeetingDto,
  CreateMeetingParticipantDto,
} from '../dto/meetings/create-meeting.dto';
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

  async create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
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

    const transcript = createMeetingDto.transcript?.trim()
      ? await this.transcriptsRepository.create({
          meetingId: meeting.id,
          content: createMeetingDto.transcript,
          fileFormat: createMeetingDto.transcriptFileFormat ?? 'text',
        })
      : undefined;

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
      transcriptId: transcript?.id ?? createMeetingDto.transcriptId,
    });

    return updatedMeeting ?? meeting;
  }

  findAll(): Promise<Meeting[]> {
    return this.meetingsRepository.findAll();
  }

  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findOne(id);
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    return meeting;
  }

  async update(id: string, updateMeetingDto: UpdateMeetingDto): Promise<Meeting> {
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

  async remove(id: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.remove(id);
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    return meeting;
  }

  async importMeetTranscript(id: string) {
    const meeting = await this.findOne(id);
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

  findInvitationsByEmail(email: string): Promise<Invitation[]> {
    return this.invitationsRepository.findByParticipantEmail(email);
  }

  findNotificationsByEmail(email: string): Promise<Notification[]> {
    return this.notificationsRepository.findByRecipientEmail(email);
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
}
