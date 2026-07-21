import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceStatus } from '../models/attendee.schema';
import { Invitation, InvitationDocument } from '../models/invitation.schema';

type CreateInvitationData = Omit<
  Invitation,
  'id' | 'createdAt' | 'updatedAt' | 'sentAt' | 'invitationStatus'
> & {
  invitationStatus?: AttendanceStatus;
  sentAt?: string;
};

@Injectable()
export class InvitationsRepository {
  constructor(
    @InjectModel(Invitation.name) private readonly invitationModel: Model<InvitationDocument>,
  ) {}

  async create(data: CreateInvitationData): Promise<Invitation> {
    const invitation = await this.invitationModel.create({
      invitationStatus: data.invitationStatus ?? AttendanceStatus.Invited,
      sentAt: data.sentAt ?? new Date().toISOString(),
      ...data,
    });
    return this.toModel(invitation);
  }

  async findAll(): Promise<Invitation[]> {
    const invitations = await this.invitationModel.find().exec();
    return invitations.map((invitation) => this.toModel(invitation));
  }

  async findByParticipantEmail(email: string): Promise<Invitation[]> {
    const invitations = await this.invitationModel
      .find({ participantEmail: email.toLowerCase().trim() })
      .sort({ sentAt: -1 })
      .exec();
    return invitations.map((invitation) => this.toModel(invitation));
  }

  async findByMeetingId(meetingId: string): Promise<Invitation[]> {
    const invitations = await this.invitationModel.find({ meetingId }).sort({ sentAt: -1 }).exec();
    return invitations.map((invitation) => this.toModel(invitation));
  }

  async findOne(id: string): Promise<Invitation | undefined> {
    const invitation = await this.invitationModel.findById(id).exec();
    return invitation ? this.toModel(invitation) : undefined;
  }

  async update(id: string, data: Partial<Invitation>): Promise<Invitation | undefined> {
    const rest = { ...data };
    delete rest.id;
    const invitation = await this.invitationModel
      .findByIdAndUpdate(id, this.withoutUndefined(rest), { returnDocument: 'after' })
      .exec();
    return invitation ? this.toModel(invitation) : undefined;
  }

  async remove(id: string): Promise<Invitation | undefined> {
    const invitation = await this.invitationModel.findByIdAndDelete(id).exec();
    return invitation ? this.toModel(invitation) : undefined;
  }

  private toModel(document: InvitationDocument): Invitation {
    return {
      id: document._id.toString(),
      meetingId: document.meetingId,
      participantEmail: document.participantEmail,
      invitationStatus: document.invitationStatus,
      sentAt: document.sentAt,
      createdAt: document.createdAt?.toString(),
      updatedAt: document.updatedAt?.toString(),
    };
  }

  private withoutUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  }
}
