import { Module } from '@nestjs/common';
import { AudiobookController } from './audiobook.controller';
import { AudiobookService } from './audiobook.service';
import { AlignmentService } from './alignment.service';
import { BullModule } from '@nestjs/bullmq';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'audiobook-sync',
    }),
    AwsModule,
  ],
  controllers: [AudiobookController],
  providers: [AudiobookService, AlignmentService],
  exports: [AudiobookService],
})
export class AudiobookModule {}
