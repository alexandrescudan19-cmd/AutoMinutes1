import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiStatus, MeetingStatus } from '../../models/meeting.schema';

export class CreateMeetingDto {
  @ApiProperty({ example: '65f1a6a6f2c2a7b4f0e7a111' })
  ownerId!: string;

  @ApiProperty({ example: 'Sprint planning' })
  title!: string;

  @ApiPropertyOptional({ example: 'Planificare task-uri pentru sprintul urmator.' })
  description?: string;

  @ApiProperty({ example: '2026-07-20T10:00:00.000Z' })
  startDateTime!: string | Date;

  @ApiProperty({ example: '2026-07-20T11:00:00.000Z' })
  endDateTime!: string | Date;

  @ApiPropertyOptional({ enum: MeetingStatus, example: MeetingStatus.Upcoming })
  status?: MeetingStatus;

  @ApiPropertyOptional({ enum: AiStatus, example: AiStatus.Idle })
  aiStatus?: AiStatus;

  @ApiPropertyOptional({ example: 'https://meet.google.com/abc-defg-hij' })
  googleMeetLink?: string;

  @ApiPropertyOptional({ example: 'google-calendar-event-id' })
  googleCalendarEventId?: string;

  @ApiPropertyOptional({ example: '65f1a6a6f2c2a7b4f0e7a222' })
  transcriptId?: string;

  @ApiPropertyOptional({ example: '65f1a6a6f2c2a7b4f0e7a333' })
  aiResultId?: string;

  @ApiPropertyOptional({
    example: ['65f1a6a6f2c2a7b4f0e7a444'],
    type: [String],
  })
  attendeeIds?: string[];

  @ApiPropertyOptional({
    example: ['65f1a6a6f2c2a7b4f0e7a555'],
    type: [String],
  })
  invitationIds?: string[];

  @ApiPropertyOptional({
    example: ['65f1a6a6f2c2a7b4f0e7a666'],
    type: [String],
  })
  notificationIds?: string[];
}
