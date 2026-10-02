import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GraphExtractionService } from './graph-extraction.service';

/**
 * Runs on its own queue, separate from 'book-ingestion' (RagModule), so this
 * module needs no dependency on RagModule's processor and there is no risk
 * of two @Processor classes racing the same queue. IngestionProcessor
 * enqueues here as its final step; see rag/ingestion.processor.ts.
 */
@Processor('book-graph-extraction')
export class GraphExtractionProcessor extends WorkerHost {
  private readonly logger = new Logger(GraphExtractionProcessor.name);

  constructor(private extraction: GraphExtractionService) {
    super();
  }

  async process(
    job: Job<{ bookId: string; pageStart?: number; pageEnd?: number }>,
  ): Promise<void> {
    switch (job.name) {
      case 'extract-graph':
        // No page scope ⇒ the whole book, built CHAPTER BY CHAPTER and
        // accumulated (the pre-generation path). A page scope keeps the legacy
        // range build. Once the Graph tab stops offering reader-triggered range
        // builds (Stage 2), the scoped branch is only the admin/back-compat path.
        return job.data.pageStart != null
          ? this.extraction.extractForBook(job.data.bookId, {
              pageStart: job.data.pageStart,
              pageEnd: job.data.pageEnd,
            })
          : this.extraction.extractAllChapters(job.data.bookId);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }
}
