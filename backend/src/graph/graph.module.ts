import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RagModule } from '../rag/rag.module';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { GraphExtractionService } from './graph-extraction.service';
import { GraphExtractionProcessor } from './graph-extraction.processor';
import { CommunityDetectionService } from './community-detection.service';
import { GraphEmbeddingService } from './graph-embedding.service';

@Module({
  imports: [
    // forwardRef: RagModule's mastery-aware retrieval (§2) needs GraphService
    // back, so this is a genuine two-way dependency, not just a queue client.
    forwardRef(() => RagModule), // QdrantInitService, LLM_PROVIDER
    BullModule.registerQueue({ name: 'book-graph-extraction' }),
  ],
  controllers: [GraphController],
  providers: [
    GraphService,
    GraphExtractionService,
    GraphExtractionProcessor,
    CommunityDetectionService,
    GraphEmbeddingService,
  ],
  exports: [GraphService],
})
export class GraphModule {}
