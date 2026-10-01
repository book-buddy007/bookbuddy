import { Module } from '@nestjs/common';
import { SuperAdminController } from './controllers/super-admin.controller';
import { SuperAdminCatalogController } from './controllers/super-admin-catalog.controller';
import { BrandingController } from './controllers/branding.controller';
import { HomepageController } from './controllers/homepage.controller';
import { SuperAdminService } from './services/super-admin.service';
import { SuperAdminCatalogService } from './services/super-admin-catalog.service';
import { TaxonomyClientService } from './services/taxonomy-client.service';
import { BookTaxonomyService } from './services/book-taxonomy.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AwsModule } from '../aws/aws.module';
import { SubscriptionCronService } from './services/subscription.cron';
import { StorageCronService } from './services/storage.cron';
import { EmailModule } from '../email/email.module';
import { RagModule } from '../rag/rag.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    PrismaModule,
    AwsModule,
    EmailModule,
    // RagModule exports QdrantInitService + ContentSpineService, used by the
    // catalogue purge to flush a book's embeddings from the shared trio index.
    RagModule,
    // Producer registration so the catalogue can enqueue graph backfills; the
    // worker lives in GraphModule (registering the same queue in two modules is
    // the established pattern — see rag.module.ts).
    BullModule.registerQueue({ name: 'book-graph-extraction' }),
  ],
  controllers: [
    SuperAdminController,
    SuperAdminCatalogController,
    BrandingController,
    HomepageController,
  ],
  providers: [
    SuperAdminService,
    SuperAdminCatalogService,
    TaxonomyClientService,
    BookTaxonomyService,
    SubscriptionCronService,
    StorageCronService,
  ],
  exports: [SuperAdminService, SuperAdminCatalogService],
})
export class AdminModule {}
