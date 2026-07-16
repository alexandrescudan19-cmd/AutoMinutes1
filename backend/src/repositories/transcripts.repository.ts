import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transcript, TranscriptDocument } from '../models/transcript.schema';

type CreateTranscriptData = Omit<Transcript, 'id' | 'createdAt' | 'updatedAt' | 'uploadedAt'> & {
  uploadedAt?: string;
};

@Injectable()
export class TranscriptsRepository {
  constructor(
    @InjectModel(Transcript.name) private readonly transcriptModel: Model<TranscriptDocument>,
  ) {}

  async create(data: CreateTranscriptData): Promise<Transcript> {
    const transcript = await this.transcriptModel.create({
      uploadedAt: data.uploadedAt ?? new Date().toISOString(),
      ...data,
    });
    return this.toModel(transcript);
  }

  async findAll(): Promise<Transcript[]> {
    const transcripts = await this.transcriptModel.find().exec();
    return transcripts.map((transcript) => this.toModel(transcript));
  }

  async findOne(id: string): Promise<Transcript | undefined> {
    const transcript = await this.transcriptModel.findById(id).exec();
    return transcript ? this.toModel(transcript) : undefined;
  }

  async update(id: string, data: Partial<Transcript>): Promise<Transcript | undefined> {
    const rest = { ...data };
    delete rest.id;
    const transcript = await this.transcriptModel
      .findByIdAndUpdate(id, this.withoutUndefined(rest), { returnDocument: 'after' })
      .exec();
    return transcript ? this.toModel(transcript) : undefined;
  }

  async remove(id: string): Promise<Transcript | undefined> {
    const transcript = await this.transcriptModel.findByIdAndDelete(id).exec();
    return transcript ? this.toModel(transcript) : undefined;
  }

  private toModel(document: TranscriptDocument): Transcript {
    return {
      id: document._id.toString(),
      meetingId: document.meetingId,
      content: document.content,
      fileFormat: document.fileFormat,
      uploadedAt: document.uploadedAt,
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
