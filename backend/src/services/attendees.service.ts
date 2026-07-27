import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAttendeeDto } from '../dto/attendees/create-attendee.dto';
import { UpdateAttendeeDto } from '../dto/attendees/update-attendee.dto';
import { Attendee } from '../models/attendee.schema';
import { AttendeesRepository } from '../repositories/attendees.repository';

@Injectable()
export class AttendeesService {
  constructor(private readonly attendeesRepository: AttendeesRepository) {}

  findAll(): Promise<Attendee[]> {
    return this.attendeesRepository.findAll();
  }

  async findOne(id: string): Promise<Attendee> {
    const attendee = await this.attendeesRepository.findOne(id);
    if (!attendee) {
      throw new NotFoundException(`Attendee #${id} not found`);
    }
    return attendee;
  }

  create(dto: CreateAttendeeDto): Promise<Attendee> {
    return this.attendeesRepository.create(dto);
  }

  async update(id: string, dto: UpdateAttendeeDto): Promise<Attendee> {
    const attendee = await this.attendeesRepository.update(id, dto);
    if (!attendee) {
      throw new NotFoundException(`Attendee #${id} not found`);
    }
    return attendee;
  }

  async remove(id: string): Promise<Attendee> {
    const attendee = await this.attendeesRepository.remove(id);
    if (!attendee) {
      throw new NotFoundException(`Attendee #${id} not found`);
    }
    return attendee;
  }
}
