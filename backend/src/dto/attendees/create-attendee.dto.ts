import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../../models/attendee.schema';

export class CreateAttendeeDto {
  @ApiProperty({ example: 'Maria Ionescu' })
  name!: string;

  @ApiPropertyOptional({ example: 'maria.ionescu@example.com' })
  email?: string;

  @ApiProperty({ example: 'Frontend Developer' })
  roleInMeeting!: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, example: AttendanceStatus.Invited })
  attendanceStatus?: AttendanceStatus;
}
