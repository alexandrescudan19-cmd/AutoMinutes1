import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AttendeesController } from '../controllers/attendees.controller';
import { AttendeesService } from '../services/attendees.service';
import { AttendeesRepository } from '../repositories/attendees.repository';
import { Attendee, AttendeeSchema } from '../models/attendee.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Attendee.name, schema: AttendeeSchema }])],
  controllers: [AttendeesController],
  providers: [AttendeesService, AttendeesRepository],
})
export class AttendeesModule {}
