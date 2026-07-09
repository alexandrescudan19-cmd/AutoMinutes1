import { Module } from '@nestjs/common';
import { AiController } from '../controllers/ai.controller';
import { AiService } from '../services/ai.service';

@Module({
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
