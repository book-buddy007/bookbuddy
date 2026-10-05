import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmProvider } from '../interfaces/llm.provider.interface';
import { openAiBaseUrl, toOpenAiHttpError } from './openai-http';

@Injectable()
export class OpenAiLlmProvider implements ILlmProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    // .get, not .getOrThrow — a missing key must fail the one request that
    // needed it (and let ResilientLlmProvider fall back to Cloudflare), not
    // crash app bootstrap for everyone. This holds now that OpenAI is the
    // PRIMARY: if OPENAI_API_KEY is ever unset, requests degrade to the
    // Cloudflare fallback instead of the whole backend refusing to boot.
    this.apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    // Switchable without a code change. Set OPENAI_CHAT_MODEL to move Varta to another model.
    this.model = this.config.get<string>('OPENAI_CHAT_MODEL', 'gpt-4o-mini');
    this.baseUrl = openAiBaseUrl(this.config);
  }

  async chatStream(
    messages: { role: string; content: string }[],
    onChunk: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!this.apiKey) {
      throw new Error(
        'OpenAI chat is not configured — set OPENAI_API_KEY.',
      );
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
      signal,
    });

    if (!res.ok || !res.body) {
      throw await toOpenAiHttpError(res, 'OpenAI chat', this.model);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') return;

        try {
          const parsed = JSON.parse(raw);
          const token = parsed?.choices?.[0]?.delta?.content ?? '';
          if (token) onChunk(token);
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  }
}
