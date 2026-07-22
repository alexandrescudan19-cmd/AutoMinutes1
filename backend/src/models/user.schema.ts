import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum UserRole {
  Administrator = 'Administrator',
  User = 'Utilizator',
}

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  id!: string;

  @Prop({ required: true, trim: true })
  firstName!: string;

  @Prop({ required: true, trim: true })
  lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ enum: UserRole, default: UserRole.User })
  role!: UserRole;

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ type: String, default: null })
  verificationToken!: string | null;

  @Prop({ type: String, default: null })
  resetPasswordToken!: string | null;

  @Prop({ type: Date, default: null })
  resetPasswordExpires!: Date | null;

  @Prop({ type: String, default: null })
  googleRefreshTokenEncrypted!: string | null;

  createdAt!: string;
  updatedAt!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
