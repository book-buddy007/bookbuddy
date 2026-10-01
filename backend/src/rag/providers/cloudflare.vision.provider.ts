import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IVisionProvider } from '../interfaces/vision.provider.interface';

// llava-1.5, not the newer llama-3.2-vision family: the latter requires an
// explicit one-time model-license click-through on the Cloudflare account
// (Meta's Llama Community License + Acceptable Use Policy, including an
// EU-domicile representation) before the API will serve it — confirmed via
// a real call, which returned a 403 with that exact requirement. Accepting
// a license agreement on the account owner's behalf isn't this codebase's
// call to make silently, so this uses a model with no such gate instead.
const DEFAULT_MODEL = '@cf/llava-hf/llava-1.5-7b-hf';

@Injectable()
export class CloudflareVisionProvider implements IVisionProvider {
  private readonly logger = new Logger(CloudflareVisionProvider.name);
  private readonly url: string | null;
  private readonly headers: Record<string, string>;

  constructor(private config: ConfigService) {
    // .get, not .getOrThrow — an unconfigured AI provider must fail the one
    // request that needs it, not stop the whole API from booting.
    const accountId = this.config.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const token = this.config.get<string>('CLOUDFLARE_AI_TOKEN');
    const model = this.config.get<string>('CF_VISION_MODEL', DEFAULT_MODEL);
    this.url = accountId && token
      ? `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`
      : null;
    this.headers = { Authorization: `Bearer ${token ?? ''}`, 'Content-Type': 'application/json' };
    if (!this.url) {
      this.logger.warn('Cloudflare vision not configured (CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_AI_TOKEN unset) — image description disabled.');
    }
  }

  async describe(imageBytes: Buffer, prompt: string): Promise<string> {
    if (!this.url) {
      throw new Error('Vision model is not configured: set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN.');
    }
    const res = await fetch(this.url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ image: Array.from(imageBytes), prompt, max_tokens: 512 }),
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Cloudflare vision call failed: ${res.status} ${body}`);
      throw new Error(`Vision model call failed: ${res.status}`);
    }

    const data = (await res.json()) as { result?: { description?: string } };
    return data.result?.description?.trim() ?? '';
  }
}
