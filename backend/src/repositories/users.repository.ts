import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../models/user.schema';

type CreateUserData = Omit<
  User,
  'id' | 'createdAt' | 'updatedAt' | 'role' | 'isVerified' | 'verificationToken'
> & {
  role?: UserRole;
  isVerified?: boolean;
  verificationToken?: string | null;
};

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  async create(data: CreateUserData): Promise<User> {
    const user = await this.userModel.create({
      role: data.role ?? UserRole.User,
      ...data,
    });
    return this.toModel(user);
  }

  async findAll(): Promise<User[]> {
    const users = await this.userModel.find().exec();
    return users.map((user) => this.toModel(user));
  }

  async findOne(id: string): Promise<User | undefined> {
    const user = await this.userModel.findById(id).exec();
    return user ? this.toModel(user) : undefined;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const user = await this.userModel.findOne({ email: email.toLocaleLowerCase().trim() }).exec();
    return user ? this.toModel(user) : undefined;
  }

  async findByVerificationToken(token: string): Promise<User | undefined> {
    const user = await this.userModel.findOne({ verificationToken: token }).exec();
    return user ? this.toModel(user) : undefined;
  }

  async update(id: string, data: Partial<User>): Promise<User | undefined> {
    const rest = { ...data };
    delete rest.id;
    const update = this.withoutUndefined(rest);
    const user = await this.userModel
      .findByIdAndUpdate(id, update, { returnDocument: 'after' })
      .exec();
    return user ? this.toModel(user) : undefined;
  }

  async remove(id: string): Promise<User | undefined> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    return user ? this.toModel(user) : undefined;
  }

  private toModel(document: UserDocument): User {
    return {
      id: document._id.toString(),
      firstName: document.firstName,
      lastName: document.lastName,
      email: document.email,
      passwordHash: document.passwordHash,
      role: document.role,
      isVerified: document.isVerified,
      verificationToken: document.verificationToken ?? null,
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
