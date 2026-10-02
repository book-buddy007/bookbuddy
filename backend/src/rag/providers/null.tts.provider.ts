import { Injectable, Logger } from '@nestjs/common';
import {
  ITtsProvider,
  TtsLine,
  TtsResult,
} from '../interfaces/tts.provider.interface';

/**
 * Default TTS_PROVIDER binding — this codebase has no TTS vendor wired up
 * at all (no ElevenLabs/Polly/Azure Speech, no API key, nothing). Picking a
 * TTS vendor and provisioning real credentials is a product/infra decision,
 * not something to make silently while building §8. This binding makes that
 * gap explicit and loud (a log line every time it's hit) rather than
 * pretending audio rendering works — DigestService treats a null result as
 * "script-only," not an error, so the feature is still useful without it.
 */
@Injectable()
export class NullTtsProvider implements ITtsProvider {
  private readonly logger = new Logger(NullTtsProvider.name);

  synthesize(
    _script: TtsLine[],
    _voicePair: string,
  ): Promise<TtsResult | null> {
    this.logger.warn(
      'No TTS provider is configured — chapter digest will be script-only (no audio). ' +
        'Wire a real ITtsProvider implementation (ElevenLabs/Polly/Azure Speech/etc.) to enable audio rendering.',
    );
    return Promise.resolve(null);
  }
}
