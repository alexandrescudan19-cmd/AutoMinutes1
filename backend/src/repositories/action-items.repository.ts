import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActionItem, ActionItemDocument, ActionItemStatus } from '../models/action-item.schema';

type CreateActionItemData = Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt' | 'status'> & {
  status?: ActionItemStatus;
};

@Injectable()
export class ActionItemsRepository {
  constructor(
    @InjectModel(ActionItem.name) private readonly actionItemModel: Model<ActionItemDocument>,
  ) {}

  async create(data: CreateActionItemData): Promise<ActionItem> {
    // Creeaza actiunea in baza. acum.
    const actionItem = await this.actionItemModel.create({
      status: data.status ?? ActionItemStatus.Pending,
      ...data,
    });
    return this.toModel(actionItem);
  }

  async findAll(): Promise<ActionItem[]> {
    // Listeaza toate actiunile salvate. acum.
    const actionItems = await this.actionItemModel.find().exec();
    return actionItems.map((actionItem) => this.toModel(actionItem));
  }

  async findByAiResultId(aiResultId: string): Promise<ActionItem[]> {
    // Gaseste actiunile rezultatului AI. acum.
    const actionItems = await this.actionItemModel
      .find({ aiResultId })
      .sort({ status: 1, dueDate: 1, createdAt: -1 })
      .exec();
    return actionItems.map((actionItem) => this.toModel(actionItem));
  }

  async findByAiResultIds(aiResultIds: string[]): Promise<ActionItem[]> {
    // Gaseste actiunile rezultatelor AI. acum.
    if (aiResultIds.length === 0) {
      return [];
    }

    const actionItems = await this.actionItemModel
      .find({ aiResultId: { $in: aiResultIds } })
      .sort({ status: 1, dueDate: 1, createdAt: -1 })
      .exec();
    return actionItems.map((actionItem) => this.toModel(actionItem));
  }

  async findByMeetingId(meetingId: string, aiResultId?: string): Promise<ActionItem[]> {
    // Gaseste actiunile meetingului curent acum.
    const filters: Record<string, unknown>[] = [{ meetingId }];
    if (aiResultId) {
      filters.push({ aiResultId });
    }

    const actionItems = await this.actionItemModel
      .find({ $or: filters })
      .sort({ status: 1, dueDate: 1, createdAt: -1 })
      .exec();
    return actionItems.map((actionItem) => this.toModel(actionItem));
  }

  async findByMeetingIds(meetingIds: string[], aiResultIds: string[]): Promise<ActionItem[]> {
    // Gaseste actiunile meetingurilor accesibile acum.
    if (meetingIds.length === 0 && aiResultIds.length === 0) {
      return [];
    }

    const filters: Record<string, unknown>[] = [];
    if (meetingIds.length > 0) {
      filters.push({ meetingId: { $in: meetingIds } });
    }
    if (aiResultIds.length > 0) {
      filters.push({ aiResultId: { $in: aiResultIds } });
    }

    const actionItems = await this.actionItemModel
      .find({ $or: filters })
      .sort({ status: 1, dueDate: 1, createdAt: -1 })
      .exec();
    return actionItems.map((actionItem) => this.toModel(actionItem));
  }

  async findOne(id: string): Promise<ActionItem | undefined> {
    // Gaseste actiunea dupa id. acum.
    const actionItem = await this.actionItemModel.findById(id).exec();
    return actionItem ? this.toModel(actionItem) : undefined;
  }

  async update(id: string, data: Partial<ActionItem>): Promise<ActionItem | undefined> {
    // Actualizeaza actiunea dupa id. acum.
    const rest = { ...data };
    delete rest.id;
    const actionItem = await this.actionItemModel
      .findByIdAndUpdate(id, this.withoutUndefined(rest), { returnDocument: 'after' })
      .exec();
    return actionItem ? this.toModel(actionItem) : undefined;
  }

  async remove(id: string): Promise<ActionItem | undefined> {
    // Sterge actiunea dupa id. acum.
    const actionItem = await this.actionItemModel.findByIdAndDelete(id).exec();
    return actionItem ? this.toModel(actionItem) : undefined;
  }

  private toModel(document: ActionItemDocument): ActionItem {
    // Converteste documentul in model. acum.
    return {
      id: document._id.toString(),
      meetingId: document.meetingId,
      aiResultId: document.aiResultId,
      task: document.task,
      responsiblePerson: document.responsiblePerson,
      dueDate: document.dueDate,
      status: document.status,
      confidenceScore: document.confidenceScore,
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
