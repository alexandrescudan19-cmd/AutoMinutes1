import { Module } from '@nestjs/common';
import { AttendeesController } from '../controllers/attendees.controller';
import { AttendeesService } from '../services/attendees.service';

@Module({
  controllers: [AttendeesController],
  providers: [AttendeesService],
})
export class AttendeesModule {}
