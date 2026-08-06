import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'AutoMinutes API is running';
  }

  getHealth() {
    return {
      status: 'ok',
      service: 'autominutes-api',
      uptime: process.uptime(),
    };
  }
}
