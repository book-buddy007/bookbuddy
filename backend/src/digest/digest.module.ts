import { Module } from '@nestjs/common';
import { RagModule } from '../rag/rag.module';
import { TTS_PROVIDER } from '../rag/interfaces/tts.provider.interface';
import { NullTtsProvider } from '../rag/providers/null.tts.provider';
import { DigestService } from './digest.service';
import { DigestController } from './digest.controller';

@Module({
  imports: [RagModule], // QdrantInitService, LLM_PROVIDER
  controllers: [DigestController],
  providers: [
    {
      provide: TTS_PROVIDER,
      useClass: NullTtsProvider,
    },
    DigestService,
  ],
})
export class DigestModule {}
