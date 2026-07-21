import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../models/notification.schema';

type CreateNotificationData = Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'sentAt'> & {
  sentAt?: string;
};

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = await this.notificationModel.create({
      sentAt: data.sentAt ?? new Date().toISOString(),
      ...data,
    });
    return this.toModel(notification);
  }

  async findAll(): Promise<Notification[]> {
    const notifications = await this.notificationModel.find().exec();
    return notifications.map((notification) => this.toModel(notification));
  }

  async findByRecipientEmail(email: string): Promise<Notification[]> {
    const notifications = await this.notificationModel
      .find({ recipientEmail: email.toLowerCase().trim() })
      .sort({ sentAt: -1 })
      .exec();
    return notifications.map((notification) => this.toModel(notification));
  }

  async findOne(id: string): Promise<Notification | undefined> {
    const notification = await this.notificationModel.findById(id).exec();
    return notification ? this.toModel(notification) : undefined;
  }

  async update(id: string, data: Partial<Notification>): Promise<Notification | undefined> {
    const rest = { ...data };
    delete rest.id;
    const notification = await this.notificationModel
      .findByIdAndUpdate(id, this.withoutUndefined(rest), { returnDocument: 'after' })
      .exec();
    return notification ? this.toModel(notification) : undefined;
  }

  async remove(id: string): Promise<Notification | undefined> {
    const notification = await this.notificationModel.findByIdAndDelete(id).exec();
    return notification ? this.toModel(notification) : undefined;
  }

  private toModel(document: NotificationDocument): Notification {
    return {
      id: document._id.toString(),
      title: document.title,
      message: document.message,
      type: document.type,
      recipientEmail: document.recipientEmail,
      meetingId: document.meetingId,
      isRead: document.isRead,
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
