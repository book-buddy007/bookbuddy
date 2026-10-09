import { Module, forwardRef } from '@nestjs/common';
import { AudiobookController } from './audiobook.controller';
import { AudiobookService } from './audiobook.service';
import { AlignmentService } from './alignment.service';
import { BullModule } from '@nestjs/bullmq';
import { AwsModule } from '../aws/aws.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audiobook-sync',
    }),
    AwsModule,
    // Playing a hub-owned book asks the hub for the track's file (HubFilesService).
    forwardRef(() => RagModule),
  ],
  controllers: [AudiobookController],
  providers: [AudiobookService, AlignmentService],
  exports: [AudiobookService],
})
export class AudiobookModule {}
