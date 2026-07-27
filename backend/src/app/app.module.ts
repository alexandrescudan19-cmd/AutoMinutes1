import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MeetingsModule } from '../modules/meetings.module';
import { AiModule } from '../modules/ai.module';
import { AuthModule } from '../modules/auth.module';
import { AttendeesModule } from '../modules/attendees.module';
import { UsersModule } from '../modules/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/autominutes',
      }),
    }),
    MeetingsModule,
    AiModule,
    AuthModule,
    AttendeesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
