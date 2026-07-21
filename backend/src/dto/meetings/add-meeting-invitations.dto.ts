import { ApiProperty } from '@nestjs/swagger';
import { CreateMeetingParticipantDto } from './create-meeting.dto';

export class AddMeetingInvitationsDto {
  @ApiProperty({
    type: [CreateMeetingParticipantDto],
    example: [
      {
        name: 'Maria Ionescu',
        email: 'maria.ionescu@example.com',
        roleInMeeting: 'Frontend Developer',
      },
    ],
  })
  participants!: CreateMeetingParticipantDto[];
}
