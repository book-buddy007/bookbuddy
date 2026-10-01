import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../aws/s3.service';
import { tokenizeReference, alignWords, AlignedWord } from './word-align.util';

const OPENAI_TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';

/**
 * Reading Intelligence Layer §5 — word-level timestamp alignment.
 *
 * NOT verified against real audio in this environment: this depends on a
 * real OPENAI_API_KEY (whisper-1 is the only already-integrated provider
 * with genuine word-level timestamps — see word-align.util.ts's header for
 * why) and a real narrated audio file, neither of which exists in this
 * dev/test setup. Reviewed and typechecked, not empirically confirmed to
 * produce good alignments — verify with a real key and a real section
 * before trusting this in production.
 */
@Injectable()
export class AlignmentService {
  private readonly logger = new Logger(AlignmentService.name);

  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
    private config: ConfigService,
  ) {}

  async getOrGenerate(sectionId: string, gender: 'MALE' | 'FEMALE'): Promise<AlignedWord[]> {
    const track = await this.prisma.audioTrack.findFirst({ where: { sectionId, gender } });
    if (!track) {
      throw new NotFoundException(`No ${gender} audio track for this section.`);
    }
    if (track.alignmentStatus === 'ready' && track.wordAlignment) {
      return track.wordAlignment as unknown as AlignedWord[];
    }
    return this.generate(track.id);
  }

  private async generate(trackId: string): Promise<AlignedWord[]> {
    const track = await this.prisma.audioTrack.findUnique({
      where: { id: trackId },
      include: { section: true },
    });
    if (!track) throw new NotFoundException('Audio track not found.');

    await this.prisma.audioTrack.update({
      where: { id: trackId },
      data: { alignmentStatus: 'pending', alignmentError: null },
    });

    try {
      if (!track.section.transcriptUrl) {
        throw new Error('This section has no reference transcript to align against.');
      }

      const [audioBuffer, referenceText] = await Promise.all([
        this.fetchAudio(track.fileUrl),
        this.fetchTranscript(track.section.transcriptUrl),
      ]);

      const asrWords = await this.transcribeWithTimestamps(audioBuffer);
      const refWords = tokenizeReference(referenceText);
      const aligned = alignWords(refWords, asrWords);

      await this.prisma.audioTrack.update({
        where: { id: trackId },
        data: {
          wordAlignment: aligned as any,
          alignmentStatus: 'ready',
          alignmentError: null,
        },
      });

      this.logger.log(`Aligned ${aligned.length} words for track ${trackId}`);
      return aligned;
    } catch (err: any) {
      this.logger.error(`Alignment failed for track ${trackId}: ${err.message}`);
      await this.prisma.audioTrack.update({
        where: { id: trackId },
        data: { alignmentStatus: 'failed', alignmentError: err.message },
      });
      throw err;
    }
  }

  private async fetchAudio(fileUrl: string): Promise<Buffer> {
    const url = await this.s3.getPresignedDownloadUrl({ key: fileUrl });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch audio file: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }

  private async fetchTranscript(transcriptUrl: string): Promise<string> {
    const url = await this.s3.getPresignedDownloadUrl({ key: transcriptUrl });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch reference transcript: HTTP ${res.status}`);
    return res.text();
  }

  /**
   * whisper-1 with response_format=verbose_json and
   * timestamp_granularities[]=word is, as of this writing, the only
   * already-integrated provider capable of real word-level timestamps —
   * Cloudflare Workers AI's hosted Whisper models document segment-level
   * timing only, not per-word.
   */
  private async transcribeWithTimestamps(audio: Buffer): Promise<{ word: string; startMs: number; endMs: number }[]> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    if (!apiKey) {
      throw new Error('Word-level alignment requires OPENAI_API_KEY to be configured — none is set.');
    }

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(audio)]), 'audio.mp3');
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'word');

    const res = await fetch(OPENAI_TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI transcription failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    const words = Array.isArray(json.words) ? json.words : [];
    return words.map((w: any) => ({
      word: String(w.word ?? ''),
      startMs: Math.round((w.start ?? 0) * 1000),
      endMs: Math.round((w.end ?? 0) * 1000),
    }));
  }
}
