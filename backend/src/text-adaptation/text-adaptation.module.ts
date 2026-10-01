import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { QuizModule } from '../quiz/quiz.module';
import { TextAdaptationService } from './text-adaptation.service';
import { TextAdaptationController } from './text-adaptation.controller';

@Module({
  // Plain imports, no forwardRef needed: unlike RagModule, this module isn't
  // imported back by RagModule or QuizModule, so there's no cycle — it just
  // sits on top of both for QdrantInitService/LLM_PROVIDER and MasteryService.
  imports: [RagModule, QuizModule],
  controllers: [TextAdaptationController],
  providers: [TextAdaptationService],
})
export class TextAdaptationModule {}
