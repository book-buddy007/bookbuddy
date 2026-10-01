import { Module, forwardRef } from '@nestjs/common';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { RagModule } from '../rag/rag.module';

/**
 * Public catalog module. Prisma, S3 and DRM services are provided by
 * global modules (PrismaModule, AwsModule, DrmModule).
 *
 * RagModule is imported for ContentSpineService, which the page-map endpoint
 * needs to read the book's true printed page extent.
 *
 * forwardRef even though nothing imports BooksModule back — there is no cycle
 * through here. RagModule already sits inside a forwardRef cluster with
 * GraphModule and QuizModule, and pulling a module out of one by plain import
 * makes this module's resolution depend on that cluster settling first. The
 * lazy reference costs nothing and keeps that ordering irrelevant.
 */
@Module({
  imports: [forwardRef(() => RagModule)],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
