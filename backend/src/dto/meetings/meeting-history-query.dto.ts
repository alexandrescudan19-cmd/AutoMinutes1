import { ApiPropertyOptional } from '@nestjs/swagger';
import { AiStatus, MeetingStatus } from '../../models/meeting.schema';

export type MeetingHistorySort = 'newest' | 'oldest' | 'status' | 'title';

export class MeetingHistoryQueryDto {
  @ApiPropertyOptional({ example: 'planning' })
  search?: string;

  @ApiPropertyOptional({ enum: ['newest', 'oldest', 'status', 'title'], example: 'newest' })
  sort?: MeetingHistorySort;

  @ApiPropertyOptional({ enum: MeetingStatus, example: MeetingStatus.Upcoming })
  status?: MeetingStatus;

  @ApiPropertyOptional({ example: 1 })
  page?: string;

  @ApiPropertyOptional({ example: 5 })
  pageSize?: string;

  @ApiPropertyOptional({ enum: AiStatus, example: AiStatus.Completed })
  aiStatus?: AiStatus;
}
