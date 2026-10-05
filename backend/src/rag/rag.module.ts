import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { QdrantInitService } from './qdrant-init.service';
import { EmbeddingService } from './embedding.service';
import { FileService } from './file.service';
import { LocalIndexerService } from './local/local-indexer.service';
import { EmbeddingController } from './embedding.controller';
import { IngestionProcessor } from './ingestion.processor';
import { EmbeddingRecoveryCron } from './embedding-recovery.cron';
import { RagSearchService } from './rag-search.service';
import { ContentSpineService } from './content-spine.service';
import { CurriculumScopeClientService } from './curriculum-scope-client.service';
import { RerankService } from './rerank.service';
import { LlmRerankService } from './llm-rerank.service';
import { AnswerCacheService } from './answer-cache.service';
import { BookChatService } from './book-chat.service';
import { DialoguePolicyService } from './dialogue-policy.service';
import { MasteryAwareRetrievalService } from './mastery-retrieval.service';
import { BookChatController } from './book-chat.controller';
import { GraphModule } from '../graph/graph.module';
import { QuizModule } from '../quiz/quiz.module';
import { UserPreferencesModule } from '../user-preferences/user-preferences.module';
import { EMBEDDING_PROVIDER } from './interfaces/embedding.provider.interface';
import { LLM_PROVIDER } from './interfaces/llm.provider.interface';
import { RERANKER_PROVIDER } from './interfaces/reranker.provider.interface';
import { OpenAiEmbeddingProvider } from './providers/openai.embedding.provider';
import { CloudflareLlmProvider } from './providers/cloudflare.llm.provider';
import { OpenAiLlmProvider } from './providers/openai.llm.provider';
import { ResilientLlmProvider } from './providers/resilient.llm.provider';
import { PDFExtractKitAdapter } from './providers/pdf-extract-kit.adapter';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'book-ingestion',
      // The connection is inherited from the global BullModule config in AppModule
    }),
    // Producer-only registration — IngestionProcessor enqueues here after a
    // successful ingest. GraphModule owns the actual worker/consumer for
    // this queue; registering it in two modules is fine for BullMQ (each is
    // just a client), and keeps RagModule and GraphModule decoupled instead
    // of importing one another.
    BullModule.registerQueue({ name: 'book-graph-extraction' }),
    // §2 mastery-aware retrieval needs GraphService (§3) and MasteryService
    // (§4) back — forwardRef on both sides, see graph.module.ts/quiz.module.ts.
    forwardRef(() => GraphModule),
    forwardRef(() => QuizModule),
    // Read the learner's saved answer-language preference at prompt-build time.
    UserPreferencesModule,
  ],
  controllers: [EmbeddingController, BookChatController],
  providers: [
    {
      // OpenAI text-embedding-3-large, 3072d — NOT a preference, a requirement.
      //
      // A query vector has to live in the same space as the document vectors it
      // is compared against, and the shared trio collection was embedded with
      // this model. Cloudflare's embeddinggemma-300m produces 768 dimensions;
      // Qdrant rejects the wrong width outright, so this at least fails loudly
      // rather than returning plausible nonsense. Retrieval quality is not a
      // knob that can be tuned independently on the query side.
      provide: EMBEDDING_PROVIDER,
      useClass: OpenAiEmbeddingProvider,
    },
    {
      provide: LLM_PROVIDER,
      useClass: ResilientLlmProvider,
    },
    {
      // A real reranker: it reads the candidates instead of re-sorting the
      // score retrieval already sorted by. Self-disables to the old behaviour
      // unless RAG_LLM_RERANK=true, so deploying this changes nothing until
      // the flag is set. RerankService stays registered as the fallback.
      provide: RERANKER_PROVIDER,
      useClass: LlmRerankService,
    },
    CloudflareLlmProvider,
    OpenAiLlmProvider,
    ResilientLlmProvider,
    QdrantInitService,
    EmbeddingService,
    LocalIndexerService,
    FileService,
    PDFExtractKitAdapter,
    IngestionProcessor,
    EmbeddingRecoveryCron,
    RagSearchService,
    ContentSpineService,
    CurriculumScopeClientService,
    RerankService,
    LlmRerankService,
    AnswerCacheService,
    BookChatService,
    DialoguePolicyService,
    MasteryAwareRetrievalService,
  ],
  exports: [
    QdrantInitService,
    EmbeddingService,
    FileService,
    PDFExtractKitAdapter,
    RagSearchService,
    ContentSpineService,
    BookChatService,
    EMBEDDING_PROVIDER,
    LLM_PROVIDER,
    RERANKER_PROVIDER,
  ],
})
export class RagModule {}
