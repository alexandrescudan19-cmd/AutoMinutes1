import { AttendanceStatus } from '../../models/attendee.schema';

export class CreateAttendeeDto {
  name: string;
  email: string;
  roleInMeeting: string;
  attendanceStatus?: AttendanceStatus;
}
