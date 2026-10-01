import { Module } from '@nestjs/common';
import { VISION_PROVIDER } from '../rag/interfaces/vision.provider.interface';
import { CloudflareVisionProvider } from '../rag/providers/cloudflare.vision.provider';
import { VisualGroundingService } from './visual-grounding.service';
import { VisualGroundingController } from './visual-grounding.controller';

@Module({
  controllers: [VisualGroundingController],
  providers: [
    {
      provide: VISION_PROVIDER,
      useClass: CloudflareVisionProvider,
    },
    VisualGroundingService,
  ],
})
export class VisualGroundingModule {}
