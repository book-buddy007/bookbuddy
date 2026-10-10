import { Module, forwardRef } from '@nestjs/common';
import { DictionaryController } from './dictionary.controller';
import { DictionaryService } from './dictionary.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { InBookService } from './in-book.service';

@Module({
  // RagModule for ContentSpineService: where a book's passages live (its own index or the shared one).
  imports: [PrismaModule, forwardRef(() => RagModule)],
  controllers: [DictionaryController],
  providers: [DictionaryService, InBookService],
})
export class DictionaryModule {}
