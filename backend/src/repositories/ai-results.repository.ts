import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AIResult, AIResultDocument } from '../models/ai-result.schema';

type CreateAIResultData = Omit<
  AIResult,
  'id' | 'createdAt' | 'updatedAt' | 'generatedAt' | 'keyPoints' | 'decisions' | 'actionItemIds'
> & {
  keyPoints?: string[];
  decisions?: string[];
  actionItemIds?: string[];
  generatedAt?: string;
};

@Injectable()
export class AiResultsRepository {
  constructor(
    @InjectModel(AIResult.name) private readonly aiResultModel: Model<AIResultDocument>,
  ) {}

  async create(data: CreateAIResultData): Promise<AIResult> {
    // Creeaza rezultatul AI in baza.
    const aiResult = await this.aiResultModel.create({
      keyPoints: data.keyPoints ?? [],
      decisions: data.decisions ?? [],
      actionItemIds: data.actionItemIds ?? [],
      generatedAt: data.generatedAt ?? new Date().toISOString(),
      ...data,
    });
    return this.toModel(aiResult);
  }

  async findAll(): Promise<AIResult[]> {
    // Listeaza toate rezultatele AI. acum.
    const aiResults = await this.aiResultModel.find().exec();
    return aiResults.map((aiResult) => this.toModel(aiResult));
  }

  async findOne(id: string): Promise<AIResult | undefined> {
    // Gaseste rezultatul AI dupa id.
    const aiResult = await this.aiResultModel.findById(id).exec();
    return aiResult ? this.toModel(aiResult) : undefined;
  }

  async findLatestByTranscriptId(transcriptId: string): Promise<AIResult | undefined> {
    // Ia ultima analiza AI disponibila.
    const aiResult = await this.aiResultModel
      .findOne({ transcriptId })
      .sort({ generatedAt: -1, createdAt: -1 })
      .exec();
    return aiResult ? this.toModel(aiResult) : undefined;
  }

  async update(id: string, data: Partial<AIResult>): Promise<AIResult | undefined> {
    // Actualizeaza rezultatul AI dupa id.
    const rest = { ...data };
    delete rest.id;
    const aiResult = await this.aiResultModel
      .findByIdAndUpdate(id, this.withoutUndefined(rest), { returnDocument: 'after' })
      .exec();
    return aiResult ? this.toModel(aiResult) : undefined;
  }

  async remove(id: string): Promise<AIResult | undefined> {
    // Sterge rezultatul AI dupa id.
    const aiResult = await this.aiResultModel.findByIdAndDelete(id).exec();
    return aiResult ? this.toModel(aiResult) : undefined;
  }

  private toModel(document: AIResultDocument): AIResult {
    // Converteste documentul in model. acum.
    return {
      id: document._id.toString(),
      meetingId: document.meetingId,
      transcriptId: document.transcriptId,
      summary: document.summary,
      keyPoints: document.keyPoints,
      decisions: document.decisions,
      followUpNotes: document.followUpNotes,
      actionItemIds: document.actionItemIds,
      meetingStatistics: document.meetingStatistics,
      generatedAt: document.generatedAt,
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
