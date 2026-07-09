import { Controller, Get } from '@nestjs/common';

@Controller('attendees')
export class AttendeesController {
  @Get()
  findAll() {
    return [];
  }
}
