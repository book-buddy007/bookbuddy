import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmbeddingRecoveryCron {
  private readonly logger = new Logger(EmbeddingRecoveryCron.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_6_HOURS)
  async recoverStuckEmbeddings() {
    this.logger.log('Running stuck embedding job recovery check...');
    const threshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
    const { count } = await this.prisma.book.updateMany({
      where: {
        embeddingStatus: 'PROCESSING',
        embeddingStartedAt: { lt: threshold },
      },
      data: { embeddingStatus: 'FAILED' },
    });

    if (count > 0) {
      this.logger.warn(
        `⚠️ Recovered ${count} stuck embedding jobs → marked as FAILED`,
      );
    } else {
      this.logger.log('✅ No stuck embedding jobs found.');
    }
  }
}
