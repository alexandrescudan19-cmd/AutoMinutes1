import { ApiPropertyOptional } from '@nestjs/swagger';
import { AiStatus, MeetingStatus } from '../../models/meeting.schema';

export type MeetingHistorySort = 'newest' | 'oldest' | 'status';

export class MeetingHistoryQueryDto {
  @ApiPropertyOptional({ example: 'planning' })
  search?: string;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'status'], example: 'newest' })
  sort?: MeetingHistorySort;

  @ApiPropertyOptional({ example: 1 })
  page?: string;

  @ApiPropertyOptional({ example: 5 })
  pageSize?: string;

  @ApiPropertyOptional({ enum: MeetingStatus, example: MeetingStatus.Upcoming })
  status?: MeetingStatus;

  @ApiPropertyOptional({ enum: AiStatus, example: AiStatus.Completed })
  aiStatus?: AiStatus;
}
