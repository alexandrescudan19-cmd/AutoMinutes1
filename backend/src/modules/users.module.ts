import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersRepository } from '../repositories/users.repository';
import { User, UserSchema } from '../models/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
