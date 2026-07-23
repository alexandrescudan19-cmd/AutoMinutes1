import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendeesController } from '../controllers/attendees.controller';
import { Attendee, AttendeeSchema } from '../models/attendee.schema';
import { AttendeesRepository } from '../repositories/attendees.repository';
import { AttendeesService } from '../services/attendees.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Attendee.name, schema: AttendeeSchema }])],
  controllers: [AttendeesController],
  providers: [AttendeesService, AttendeesRepository],
})
export class AttendeesModule {}
