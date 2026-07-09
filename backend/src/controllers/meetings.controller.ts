import { Controller, Get } from '@nestjs/common';

@Controller('meetings')
export class MeetingsController {
  @Get()
  findAll() {
    return [];
  }
}
