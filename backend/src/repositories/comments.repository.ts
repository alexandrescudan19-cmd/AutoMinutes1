import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from '../models/comment.schema';

type CreateCommentData = Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>;

@Injectable()
export class CommentsRepository {
  constructor(@InjectModel(Comment.name) private readonly commentModel: Model<CommentDocument>) {}

  async create(data: CreateCommentData): Promise<Comment> {
    const comment = await this.commentModel.create(data);
    return this.toModel(comment);
  }

  async findByMeetingId(meetingId: string): Promise<Comment[]> {
    const comments = await this.commentModel.find({ meetingId }).sort({ createdAt: 1 }).exec();
    return comments.map((comment) => this.toModel(comment));
  }

  async countAll(): Promise<number> {
    return this.commentModel.countDocuments().exec();
  }

  private toModel(document: CommentDocument): Comment {
    return {
      id: document._id.toString(),
      meetingId: document.meetingId,
      authorId: document.authorId,
      authorName: document.authorName,
      authorEmail: document.authorEmail,
      message: document.message,
      createdAt: document.createdAt?.toString(),
      updatedAt: document.updatedAt?.toString(),
    };
  }
}
