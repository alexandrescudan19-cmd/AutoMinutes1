import { Injectable } from '@nestjs/common';

@Injectable()
export class OllamaService {
  getInfo() {
    return { name: 'ollama' };
  }
}
