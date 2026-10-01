export interface TtsLine {
  speaker: string;
  line: string;
}

export interface TtsResult {
  audioUri: string;
}

export interface ITtsProvider {
  /** Returns null if audio rendering isn't available (see NullTtsProvider). */
  synthesize(script: TtsLine[], voicePair: string): Promise<TtsResult | null>;
}

export const TTS_PROVIDER = Symbol('TTS_PROVIDER');
