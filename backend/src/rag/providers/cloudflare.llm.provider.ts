import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ILlmProvider } from '../interfaces/llm.provider.interface';

@Injectable()
export class CloudflareLlmProvider implements ILlmProvider {
  private readonly accountId: string;
  private readonly token: string;
  private readonly model: string;

  constructor(private config: ConfigService) {
    // .get, not .getOrThrow — Cloudflare is now the FALLBACK, so a missing
    // credential must fail only the request that reaches it (letting the
    // OpenAI primary carry the load), never crash app bootstrap for everyone.
    this.accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID', '');
    this.token = this.config.get<string>('CLOUDFLARE_AI_TOKEN', '');
    this.model = this.config.get<string>(
      'CF_CHAT_MODEL',
      '@cf/google/gemma-4-26b-a4b-it',
    );
  }

  async chatStream(
    messages: { role: string; content: string }[],
    onChunk: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!this.accountId || !this.token) {
      throw new Error(
        'Cloudflare fallback is not configured — set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN.',
      );
    }
    const chatUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`;
    const res = await fetch(chatUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages, stream: true }),
      signal,
    });

    if (!res.ok || !res.body) {
      const body = await res.text();
      throw new Error(`Cloudflare chat failed: ${res.status} ${body}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let hasContent = false;
    let reasoningFallback = ''; // collect reasoning in case content is empty

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? ''; // keep incomplete last line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') {
          // If model only produced reasoning (no content), flush reasoning as fallback
          if (!hasContent && reasoningFallback) {
            onChunk(reasoningFallback);
          }
          return;
        }

        try {
          const parsed = JSON.parse(raw);
          const delta = parsed?.choices?.[0]?.delta;

          // Gemma 4: streams delta.reasoning (think), then delta.content (answer)
          // Older CF models: { response: "token" }
          const contentToken = delta?.content ?? parsed?.response ?? '';
          const reasoningToken = delta?.reasoning ?? '';

          if (contentToken) {
            hasContent = true;
            onChunk(contentToken);
          } else if (reasoningToken) {
            reasoningFallback += reasoningToken;
          }
        } catch {
          // skip malformed SSE lines
        }
      }
    }

    // Stream ended without [DONE] — flush reasoning fallback if no content
    if (!hasContent && reasoningFallback) {
      onChunk(reasoningFallback);
    }
  }
}
