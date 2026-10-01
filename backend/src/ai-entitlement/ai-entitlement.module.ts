import { Global, Module } from '@nestjs/common';
import { AiEntitlementService } from './ai-entitlement.service';
import { AiFeatureGuard } from './ai-feature.guard';

/**
 * Global so the five RAG feature modules can each `@UseGuards(AiFeatureGuard)`
 * without importing this module — the same convenience PrismaModule already
 * relies on. PrismaService (also global) is the only dependency.
 */
@Global()
@Module({
  providers: [AiEntitlementService, AiFeatureGuard],
  exports: [AiEntitlementService, AiFeatureGuard],
})
export class AiEntitlementModule {}
