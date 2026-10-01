import { Global, Module } from '@nestjs/common';
import { BookAccessService } from './book-access.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Global so the book-scoped feature modules can inject `BookAccessService`
 * without each re-importing it — the same reasoning as AiEntitlementModule,
 * which is global for the five RAG features for exactly this reason.
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [BookAccessService],
  exports: [BookAccessService],
})
export class BookAccessModule {}
