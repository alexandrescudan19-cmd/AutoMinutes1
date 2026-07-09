import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  getStatus() {
    return { status: 'ok' };
  }
}
