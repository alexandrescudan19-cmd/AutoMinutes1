import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface OllamaGenerateResponse {
  response?: string;
}

@Injectable()
export class OllamaService {
  getInfo() {
    return {
      name: 'ollama',
      url: this.baseUrl,
      model: this.model,
    };
  }

  private readonly baseUrl = process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
  private readonly model = process.env.OLLAMA_MODEL ?? 'llama3.2:latest';

  async generateJson<T>(prompt: string): Promise<T> {
    const { data } = await axios.post<OllamaGenerateResponse>(`${this.baseUrl}/api/generate`, {
      model: this.model,
      prompt,
      stream: false,
      format: 'json',
    });

    if (!data.response) {
      throw new Error('Ollama did not return a response.');
    }

    return JSON.parse(data.response) as T;
  }
}
