import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SuperAdminService } from './super-admin.service';

@Injectable()
export class StorageCronService {
  private readonly logger = new Logger(StorageCronService.name);

  constructor(private readonly superAdminService: SuperAdminService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleTrashPurge() {
    this.logger.log('Starting automated trash purge (7-day grace period)...');
    try {
      const result = await this.superAdminService.purgeTrash();
      this.logger.log(
        `Completed trash purge: ${result.purgedCount} files deleted.`,
      );
    } catch (error) {
      this.logger.error('Failed to run automated trash purge', error);
    }
  }
}
