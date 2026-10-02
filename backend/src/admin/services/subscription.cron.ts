import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';

@Injectable()
export class SubscriptionCronService {
  private readonly logger = new Logger(SubscriptionCronService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  handleExpiredSubscriptions() {
    // TenantSubscription model removed from schema — cron is a no-op
    this.logger.log(
      'Subscription expiration check skipped (model removed from schema).',
    );
  }
}
