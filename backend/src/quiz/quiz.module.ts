import { Module, forwardRef } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { QuizController } from './quiz.controller';
import { QuizSynthesisService } from './quiz-synthesis.service';
import { QuizAssistService } from './quiz-assist.service';
import { MasteryService } from './mastery.service';

@Module({
  // forwardRef: RagModule's mastery-aware retrieval (§2) needs MasteryService
  // back, so this is a genuine two-way dependency, not just a queue client.
  imports: [forwardRef(() => RagModule)], // QdrantInitService, LLM_PROVIDER
  controllers: [QuizController],
  providers: [QuizSynthesisService, QuizAssistService, MasteryService],
  exports: [MasteryService],
})
export class QuizModule {}
