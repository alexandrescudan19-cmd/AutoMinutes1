import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { OllamaService } from './ollama.service';

type AiProviderName = 'auto' | 'ollama' | 'openai' | 'openai-compatible' | 'fallback' | 'mock';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable()
export class AiProviderService {
  constructor(private readonly ollamaService: OllamaService) {}

  getInfo() {
    const provider = this.getProvider();

    return {
      provider,
      ollama: this.ollamaService.getInfo(),
      openAiCompatible: {
        baseUrl: this.openAiBaseUrl,
        model: this.openAiModel,
        configured: Boolean(this.openAiApiKey),
      },
    };
  }

  async generateJson<T>(prompt: string): Promise<T> {
    const provider = this.getProvider();

    if (provider === 'fallback' || provider === 'mock') {
      throw new Error('Fallback provider does not call an external AI model.');
    }

    if (provider === 'openai' || provider === 'openai-compatible') {
      return this.generateOpenAiCompatibleJson<T>(prompt);
    }

    if (provider === 'ollama') {
      return this.ollamaService.generateJson<T>(prompt);
    }

    return this.generateAutoJson<T>(prompt);
  }

  private readonly openAiBaseUrl = (
    process.env.AI_BASE_URL ??
    process.env.OPENAI_BASE_URL ??
    'https://api.openai.com/v1'
  ).replace(/\/+$/, '');

  private readonly openAiApiKey = process.env.AI_API_KEY ?? process.env.OPENAI_API_KEY;
  private readonly openAiModel = process.env.AI_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  private getProvider(): AiProviderName {
    return ((process.env.AI_PROVIDER ?? 'auto').toLowerCase() as AiProviderName) || 'auto';
  }

  private async generateAutoJson<T>(prompt: string): Promise<T> {
    if (this.openAiApiKey) {
      return this.generateOpenAiCompatibleJson<T>(prompt);
    }

    return this.ollamaService.generateJson<T>(prompt);
  }

  private async generateOpenAiCompatibleJson<T>(prompt: string): Promise<T> {
    if (!this.openAiApiKey) {
      throw new Error('AI_API_KEY or OPENAI_API_KEY is required for this AI provider.');
    }

    let data: ChatCompletionResponse;

    try {
      data = await this.requestChatCompletion(prompt, true);
    } catch (error) {
      if (!this.shouldRetryWithoutJsonMode(error)) {
        throw error;
      }

      data = await this.requestChatCompletion(prompt, false);
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('AI provider did not return a message.');
    }

    return this.parseJson<T>(content);
  }

  private async requestChatCompletion(prompt: string, useJsonMode: boolean) {
    const { data } = await axios.post<ChatCompletionResponse>(
      `${this.openAiBaseUrl}/chat/completions`,
      {
        model: this.openAiModel,
        messages: [
          {
            role: 'system',
            content:
              'You return only strict JSON. Do not include markdown, code fences, or explanatory text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        ...(useJsonMode ? { response_format: { type: 'json_object' } } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${this.openAiApiKey}`,
          'Content-Type': 'application/json',
          ...(process.env.AI_HTTP_REFERER ? { 'HTTP-Referer': process.env.AI_HTTP_REFERER } : {}),
          ...(process.env.AI_APP_TITLE ? { 'X-Title': process.env.AI_APP_TITLE } : {}),
        },
        timeout: 120000,
      },
    );

    return data;
  }

  private shouldRetryWithoutJsonMode(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };
    const responseText = JSON.stringify(maybeError.response?.data ?? '').toLowerCase();
    const message = (maybeError.message ?? '').toLowerCase();

    return (
      maybeError.response?.status === 400 &&
      (responseText.includes('response_format') ||
        responseText.includes('json') ||
        message.includes('response_format'))
    );
  }

  private parseJson<T>(raw: string): T {
    const trimmed = raw.trim();

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      const match = trimmed.match(/\{[\s\S]*\}/);
      if (!match) {
        throw new Error('AI provider returned invalid JSON.');
      }

      return JSON.parse(match[0]) as T;
    }
  }
}
