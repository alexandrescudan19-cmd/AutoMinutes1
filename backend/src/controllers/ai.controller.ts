import { Controller, Get } from '@nestjs/common';

@Controller('ai')
export class AiController {
  @Get()
  getStatus() {
    return { status: 'ok' };
  }
}
