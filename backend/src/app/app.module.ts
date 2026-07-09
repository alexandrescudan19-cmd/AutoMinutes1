import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from '../modules/users.module';
import { MeetingsModule } from '../modules/meetings.module';
import { AttendeesModule } from '../modules/attendees.module';
import { AiModule } from '../modules/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    MeetingsModule,
    AttendeesModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
