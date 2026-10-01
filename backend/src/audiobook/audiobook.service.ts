import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { AudioGender, AudioSectionType } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { S3Service } from '../aws/s3.service';
import { BookAccessService } from '../common/book-access.service';

@Injectable()
export class AudiobookService {
  private readonly logger = new Logger(AudiobookService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private redis: Cache,
    private configService: ConfigService,
    private s3Service: S3Service,
    private bookAccess: BookAccessService,
  ) {}

  async getStructure(bookId: string) {
    const chapters = await this.prisma.audioChapter.findMany({
      where: { bookId },
      orderBy: { sortOrder: 'asc' },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
          include: { tracks: true },
        },
      },
    });

    const format = await this.prisma.bookFormat.findFirst({
      where: { bookId, type: 'AUDIOBOOK' },
    });

    return { chapters, format };
  }

  async getPresignedUrl(
    userId: string,
    sectionId: string,
    gender: 'MALE' | 'FEMALE',
  ) {
    // The route only carries a sectionId, so the owning book has to be
    // resolved upward (section → chapter → book) before anything can be
    // authorized against it. Without this the endpoint presigned any track for
    // any authenticated caller, regardless of tenant or tier.
    await this.bookAccess.assertCanReadSection(userId, sectionId);

    const track = await this.prisma.audioTrack.findFirst({
      where: { sectionId, gender: gender as AudioGender },
    });

    if (!track) {
      throw new NotFoundException(`Audio track not found for gender ${gender}`);
    }

    // 15 minutes, down from 12 hours. This URL needs no auth to fetch, so its
    // lifetime is how long a shared link keeps working. A section is shorter
    // than the window, and AudioProgress (buffered through Redis) makes a
    // mid-listen re-presign invisible to the listener.
    const url = await this.s3Service.getPresignedDownloadUrl({
      key: track.fileUrl,
      expiresInSeconds: 900,
    });
    return { url };
  }

  async getTranscript(sectionId: string) {
    const section = await this.prisma.audioSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || !section.transcriptUrl) {
      throw new NotFoundException('Transcript not found');
    }

    try {
      const url = await this.s3Service.getPresignedDownloadUrl({
        key: section.transcriptUrl,
      });
      const response = await fetch(url);
      return await response.text();
    } catch (e) {
      this.logger.error('Failed to fetch transcript from R2', e);
      throw new NotFoundException('Failed to fetch transcript content');
    }
  }

  async saveProgressToRedis(userId: string, bookId: string, data: any) {
    const payload = JSON.stringify({
      userId,
      bookId,
      ...data,
      timestamp: Date.now(),
    });

    // We store using the generic cache manager, and add it to a tracking set directly
    // since we use io-redis underneath.
    const store: any = (this.redis as any).store;
    if (store && store.client) {
      await store.client.hset(
        'audio:progress_buffer',
        `${userId}:${bookId}`,
        payload,
      );
    } else {
      // Fallback: Just save it to DB directly if redis store isn't available
      await this.flushSingleToDb(userId, bookId, data);
    }
    return { success: true };
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async flushAudioProgress() {
    this.logger.log('Flushing audio progress to DB');
    const store: any = (this.redis as any).store;
    if (store && store.client) {
      const client = store.client;
      // Get all buffered progress
      const allProgress = await client.hgetall('audio:progress_buffer');
      const keys = Object.keys(allProgress);
      if (keys.length === 0) return;

      for (const key of keys) {
        const val = allProgress[key];
        const data = JSON.parse(val);
        await this.flushSingleToDb(data.userId, data.bookId, data);
        await client.hdel('audio:progress_buffer', key);
      }
      this.logger.log(`Flushed ${keys.length} progress records.`);
    }
  }

  private async flushSingleToDb(userId: string, bookId: string, data: any) {
    await this.prisma.audioProgress.upsert({
      where: { userId_bookId: { userId, bookId } },
      create: {
        userId,
        bookId,
        sectionId: data.sectionId,
        positionSeconds: data.positionSeconds,
        activeGender: data.activeGender,
        showTranscript: data.showTranscript || false,
        playbackRate: data.playbackRate || 1.0,
      },
      update: {
        sectionId: data.sectionId,
        positionSeconds: data.positionSeconds,
        activeGender: data.activeGender,
        showTranscript: data.showTranscript,
        playbackRate: data.playbackRate,
      },
    });
  }

  // Management APIs
  async createChapter(
    bookId: string,
    data: { title: string; sortOrder: number },
  ) {
    return this.prisma.audioChapter.create({
      data: { bookId, title: data.title, sortOrder: data.sortOrder },
    });
  }

  async createSection(
    chapterId: string,
    data: {
      title: string;
      sortOrder: number;
      sectionType: AudioSectionType;
      durationSeconds?: number;
      fileSizeBytes?: number;
      transcriptUrl?: string;
    },
  ) {
    return this.prisma.audioSection.create({
      data: {
        chapterId,
        title: data.title,
        sortOrder: data.sortOrder,
        sectionType: data.sectionType,
        durationSeconds: data.durationSeconds,
        fileSizeBytes: data.fileSizeBytes,
        transcriptUrl: data.transcriptUrl,
      },
    });
  }

  async saveTracks(
    sectionId: string,
    data: {
      tracks: {
        gender: AudioGender;
        fileUrl: string;
        durationSeconds: number;
        fileSizeBytes?: number;
      }[];
    },
  ) {
    for (const track of data.tracks) {
      // Upsert track
      const existing = await this.prisma.audioTrack.findFirst({
        where: { sectionId, gender: track.gender },
      });
      if (existing) {
        await this.prisma.audioTrack.update({
          where: { id: existing.id },
          data: {
            fileUrl: track.fileUrl,
            durationSeconds: track.durationSeconds,
            fileSizeBytes: track.fileSizeBytes,
          },
        });
      } else {
        await this.prisma.audioTrack.create({
          data: {
            sectionId,
            gender: track.gender,
            fileUrl: track.fileUrl,
            durationSeconds: track.durationSeconds,
            fileSizeBytes: track.fileSizeBytes,
          },
        });
      }
    }
    return { success: true };
  }
}
