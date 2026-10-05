import { Injectable, Logger } from '@nestjs/common';
import { ILlmProvider } from '../interfaces/llm.provider.interface';
import { CloudflareLlmProvider } from './cloudflare.llm.provider';
import { OpenAiLlmProvider } from './openai.llm.provider';

/**
 * Wraps the primary (OpenAI) chat provider with a Cloudflare Workers AI
 * fallback.
 *
 * Streaming makes a mid-response fallback unsafe — once a token has reached
 * the caller (and therefore the client's open SSE connection), switching
 * providers and restarting would duplicate or garble what the student
 * already sees. So the fallback only engages when the primary fails before
 * producing its first chunk. A failure after that point propagates exactly
 * as before this provider existed — the caller (BookChatController) already
 * turns it into a clean SSE error event and closes the stream.
 *
 * ORDER: OpenAI is primary, Cloudflare is the fallback. Both are constructed
 * non-fatally (see each provider's key handling), so a missing key on either
 * side degrades to the other at call time rather than crashing boot.
 */
@Injectable()
export class ResilientLlmProvider implements ILlmProvider {
  private readonly logger = new Logger(ResilientLlmProvider.name);

  constructor(
    private primary: OpenAiLlmProvider,
    private fallback: CloudflareLlmProvider,
  ) {}

  async chatStream(
    messages: { role: string; content: string }[],
    onChunk: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    let emitted = false;
    const trackedChunk = (token: string) => {
      emitted = true;
      onChunk(token);
    };

    try {
      await this.primary.chatStream(messages, trackedChunk, signal);
    } catch (err) {
      if (emitted) throw err; // mid-stream failure — do not fall back
      this.logger.warn(
        `Primary model failed before answering (${(err as Error)?.message}); trying the fallback.`,
      );
      try {
        await this.fallback.chatStream(messages, onChunk, signal);
      } catch (fallbackErr) {
        // An unconfigured fallback only says "not configured", which would hide the real
        // problem (a wrong key, an unknown model). Report the primary's error in that case.
        if (/not configured/i.test((fallbackErr as Error)?.message ?? '')) {
          throw err;
        }
        throw fallbackErr;
      }
    }
  }
}
