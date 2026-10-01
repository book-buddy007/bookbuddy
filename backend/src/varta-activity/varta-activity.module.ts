import { Module } from '@nestjs/common';
import { AiEntitlementModule } from '../ai-entitlement/ai-entitlement.module';
import { VartaActivityController } from './varta-activity.controller';
import { VartaActivityService } from './varta-activity.service';

@Module({
  imports: [AiEntitlementModule], // AiEntitlementService for trial allowance
  controllers: [VartaActivityController],
  providers: [VartaActivityService],
})
export class VartaActivityModule {}
