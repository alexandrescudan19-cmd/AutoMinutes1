import { Module } from '@nestjs/common';
import { MeetingsController } from '../controllers/meetings.controller';
import { MeetingsService } from '../services/meetings.service';

@Module({
  controllers: [MeetingsController],
  providers: [MeetingsService],
})
export class MeetingsModule {}
