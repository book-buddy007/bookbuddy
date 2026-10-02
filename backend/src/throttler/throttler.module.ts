import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import {
  CustomThrottlerGuard,
  ACCOUNT_THROTTLER,
} from '../guards/throttler.guard';

/**
 * Two throttlers, deliberately.
 *
 *   'default' — keyed on the resolved client IP (see common/client-ip.ts).
 *   'account' — keyed on the account a request TARGETS, so that neither a botnet
 *               spread across many IPs nor a shared school NAT can be used to lock
 *               a user out of account recovery.
 *
 * Both apply to every route, because @nestjs/throttler evaluates all configured
 * throttlers. The 'account' bucket is therefore given a deliberately high default
 * limit so it is a no-op unless a route opts in via
 * `@Throttle({ account: { limit: n, ttl: t } })`. That keeps this change additive:
 * no existing route becomes more restrictive than it is today.
 *
 * STORAGE — a known remaining gap, tracked in audit finding BB-004.
 * Storage is still the default in-memory store, which means (a) limits are
 * per-container rather than per-cluster and (b) all rate-limit state is wiped on
 * every restart — and auto-deploy from `main` restarts containers. Moving to
 * @nest-lab/throttler-storage-redis is the follow-up; it is a dependency change,
 * so it is kept out of this patch rather than bundled into a security fix.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL', 60000), // milliseconds
            limit: config.get<number>('THROTTLE_LIMIT', 100), // requests per TTL, per client IP
          },
          {
            name: ACCOUNT_THROTTLER,
            ttl: config.get<number>('THROTTLE_ACCOUNT_TTL', 60000),
            // Effectively unlimited by default; individual routes tighten it.
            limit: config.get<number>('THROTTLE_ACCOUNT_LIMIT', 10000),
          },
        ],
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppThrottlerModule {}
