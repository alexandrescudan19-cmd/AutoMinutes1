import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceStatus, Attendee, AttendeeDocument } from '../models/attendee.schema';

type CreateAttendeeData = Omit<Attendee, 'id' | 'createdAt' | 'updatedAt' | 'attendanceStatus'> & {
  attendanceStatus?: AttendanceStatus;
  createdAt?: string;
  updatedAt?: string;
};

@Injectable()
export class AttendeesRepository {
  constructor(
    @InjectModel(Attendee.name) private readonly attendeeModel: Model<AttendeeDocument>,
  ) {}

  async create(data: CreateAttendeeData): Promise<Attendee> {
    // Creeaza participantul in baza. acum.
    const attendee = await this.attendeeModel.create({
      ...data,
      attendanceStatus: data.attendanceStatus ?? AttendanceStatus.Invited,
    });
    return this.toModel(attendee);
  }

  async findAll(): Promise<Attendee[]> {
    // Listeaza participantii din baza. acum.
    const attendees = await this.attendeeModel.find().exec();
    return attendees.map((attendee) => this.toModel(attendee));
  }

  async findOne(id: string): Promise<Attendee | undefined> {
    // Gaseste participantul dupa id. acum.
    const attendee = await this.attendeeModel.findById(id).exec();
    return attendee ? this.toModel(attendee) : undefined;
  }

  async update(id: string, data: Partial<Attendee>): Promise<Attendee | undefined> {
    // Actualizeaza participantul dupa id. acum.
    const rest = { ...data };
    delete rest.id;
    const update = this.withoutUndefined(rest);
    const attendee = await this.attendeeModel
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .exec();
    return attendee ? this.toModel(attendee) : undefined;
  }

  async remove(id: string): Promise<Attendee | undefined> {
    // Sterge participantul dupa id. acum.
    const attendee = await this.attendeeModel.findByIdAndDelete(id).exec();
    return attendee ? this.toModel(attendee) : undefined;
  }

  private toModel(document: AttendeeDocument): Attendee {
    // Converteste documentul in model. acum.
    return {
      id: document._id.toString(),
      name: document.name,
      email: document.email,
      roleInMeeting: document.roleInMeeting,
      attendanceStatus: document.attendanceStatus,
      createdAt: document.createdAt?.toString(),
      updatedAt: document.updatedAt?.toString(),
    };
  }

  private withoutUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
    // Elimina valorile undefined trimise. acum.
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }
}
