import { ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '../../models/attendee.schema';

export class UpdateAttendeeDto {
  @ApiPropertyOptional({ example: 'Maria Ionescu' })
  name?: string;

  @ApiPropertyOptional({ example: 'maria.ionescu@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'Frontend Developer' })
  roleInMeeting?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus, example: AttendanceStatus.Accepted })
  attendanceStatus?: AttendanceStatus;
}
