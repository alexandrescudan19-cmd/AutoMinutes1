import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum ActionItemStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  Completed = 'Completed',
}

export type ActionItemDocument = HydratedDocument<ActionItem>;

@Schema({ timestamps: true })
export class ActionItem {
  id!: string;

  @Prop({ type: Types.ObjectId, ref: 'AIResult' })
  aiResultId?: string;

  @Prop({ required: true, trim: true })
  task!: string;

  @Prop({ required: true, trim: true })
  responsiblePerson!: string;

  @Prop({ type: Date })
  dueDate?: Date;

  @Prop({ type: String, enum: ActionItemStatus, default: ActionItemStatus.Pending })
  status!: ActionItemStatus;

  @Prop({ type: Number, min: 0, max: 1 })
  confidenceScore?: number;

  createdAt!: string;
  updatedAt!: string;
}

export const ActionItemSchema = SchemaFactory.createForClass(ActionItem);
