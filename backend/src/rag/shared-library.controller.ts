import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpException,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { sharedIndexConfig } from './local/index-config';
import { SharedLibraryError, SharedLibraryService, isUuid } from './shared-library.service';

/**
 * Super-admin: use a book that is already embedded in the shared library (DigiClassroom)
 * instead of embedding it again here. Only available in shared-index mode.
 */
@Controller('api')
@UseGuards(BetterAuthGuard, RolesGuard)
export class SharedLibraryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly library: SharedLibraryService,
    @InjectQueue('book-ingestion') private readonly queue: Queue,
  ) {}

  private requireSharedMode() {
    if (!sharedIndexConfig()) {
      throw new ConflictException(
        'The shared library is not set up for this deployment (SHARED_QDRANT_URL is empty), so there is nothing to link to. ' +
          'See docs/shared-spine.md.',
      );
    }
  }

  private rethrow(err: unknown): never {
    if (err instanceof SharedLibraryError) {
      throw new HttpException({ message: err.message }, err.status >= 400 ? err.status : 502);
    }
    throw err;
  }

  @Get('shared-library/works')
  @Roles('super-admin')
  async works(@Query('q') q?: string, @Query('limit') limit?: string) {
    this.requireSharedMode();
    try {
      return { works: await this.library.listWorks(q, limit ? Number(limit) : 50) };
    } catch (err) {
      this.rethrow(err);
    }
  }

  @Post('books/:bookId/link-shared-work')
  @Roles('super-admin')
  async link(@Param('bookId') bookId: string, @Body() body: { contentItemId?: string }) {
    this.requireSharedMode();
    if (!isUuid(body?.contentItemId)) {
      throw new BadRequestException('contentItemId must be the id of a work in the shared library.');
    }

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, deletedAt: true },
    });
    if (!book || book.deletedAt) throw new NotFoundException('Book not found');

    // The jobId is fixed per book, as for embedding, so pressing twice during a run is a no-op.
    const existing = await this.queue.getJob(`link-${bookId}`);
    if (existing) {
      const state = await existing.getState();
      if (['active', 'waiting', 'delayed', 'prioritized', 'waiting-children'].includes(state)) {
        throw new ConflictException(`Linking is already queued or running for this book (state: ${state}).`);
      }
      await existing.remove(); // a settled job would otherwise swallow the new request
    }

    await this.queue.add(
      'link-work',
      { bookId, contentItemId: body.contentItemId },
      {
        jobId: `link-${bookId}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    );
    await this.prisma.book.update({ where: { id: bookId }, data: { embeddingStatus: 'PENDING' } });
    return { status: 'QUEUED', bookId };
  }
}
