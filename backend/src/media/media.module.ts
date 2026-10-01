import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { MediaProcessingService } from './media-processing.service';
import { AwsModule } from '../aws/aws.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AwsModule, PrismaModule],
  controllers: [MediaController],
  providers: [MediaService, MediaProcessingService],
  exports: [MediaService, MediaProcessingService],
})
export class MediaModule {}
