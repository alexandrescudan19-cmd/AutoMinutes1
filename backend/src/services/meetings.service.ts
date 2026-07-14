import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateMeetingDto } from '../dto/meetings/create-meeting.dto';
import { UpdateMeetingDto } from '../dto/meetings/update-meeting.dto';
import { Meeting } from '../models/meeting.schema';
import { MeetingsRepository } from '../repositories/meetings.repository';

@Injectable()
export class MeetingsService {
  constructor(private readonly meetingsRepository: MeetingsRepository) {}

  create(createMeetingDto: CreateMeetingDto): Promise<Meeting> {
    return this.meetingsRepository.create({
      ...createMeetingDto,
      startDateTime: new Date(createMeetingDto.startDateTime),
      endDateTime: new Date(createMeetingDto.endDateTime),
    });
  }

  findAll(): Promise<Meeting[]> {
    return this.meetingsRepository.findAll();
  }

  async findOne(id: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.findOne(id);
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    return meeting;
  }

  async update(id: string, updateMeetingDto: UpdateMeetingDto): Promise<Meeting> {
    const meeting = await this.meetingsRepository.update(id, {
      ...updateMeetingDto,
      startDateTime: updateMeetingDto.startDateTime
        ? new Date(updateMeetingDto.startDateTime)
        : undefined,
      endDateTime: updateMeetingDto.endDateTime
        ? new Date(updateMeetingDto.endDateTime)
        : undefined,
    });
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    return meeting;
  }

  async remove(id: string): Promise<Meeting> {
    const meeting = await this.meetingsRepository.remove(id);
    if (!meeting) throw new NotFoundException(`Meeting #${id} not found`);
    return meeting;
  }
}
