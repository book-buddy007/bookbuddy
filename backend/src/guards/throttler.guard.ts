import { Injectable, ExecutionContext } from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerModuleOptions,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { LoggerService } from '../logger/logger.service';
import { getClientIp, getTargetAccountKey } from '../common/client-ip';

// IPs to exempt from rate limiting (localhost in various forms)
const LOCALHOST_IPS = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

/** Name of the second, account-keyed throttler. Must match throttler.module.ts. */
export const ACCOUNT_THROTTLER = 'account';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly logger: LoggerService,
  ) {
    super(options, storageService, reflector);
    this.logger.setContext('ThrottlerGuard');
  }

  /**
   * The rate-limit subject.
   *
   * PREVIOUSLY: not overridden, so the base class used `req.ip`. With Express
   * `trust proxy` never set, `req.ip` was Traefik's address on every request and
   * all callers shared one bucket — audit finding BB-004. `getClientIp` and the
   * `trust proxy` setting applied in main.ts fix that together; neither works
   * alone.
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return getClientIp(req);
  }

  /**
   * Keys the storage entry.
   *
   * The base implementation combines the route with the `getTracker` suffix. We
   * keep that for the default (IP-keyed) throttler and swap the subject for the
   * named `account` throttler, so a route can be limited per-IP AND per-account
   * simultaneously with two independent budgets.
   *
   * When no account can be identified, we fall back to the IP suffix rather than a
   * constant — a constant would recreate the shared-bucket defect this class was
   * changed to fix.
   */
  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    if (name === ACCOUNT_THROTTLER) {
      const { req } = this.getRequestResponse(context);
      const accountKey = getTargetAccountKey(req) ?? suffix;
      return super.generateKey(context, accountKey, name);
    }
    return super.generateKey(context, suffix, name);
  }

  // Override canActivate to add logging and localhost bypass
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip throttling for localhost in development
    if (process.env.NODE_ENV !== 'production') {
      const request = context.switchToHttp().getRequest();
      const ip = request.ip || request.connection?.remoteAddress;
      if (ip && LOCALHOST_IPS.some((local) => ip.includes(local))) {
        return true;
      }
    }

    try {
      const result = await super.canActivate(context);
      return result;
    } catch (error) {
      const request = context.switchToHttp().getRequest();
      // Log the resolved client IP, not `req.ip`: before this change the log line
      // recorded the proxy's address on every entry, which made the rate-limit
      // logs useless for identifying an abusive caller.
      const ip = getClientIp(request);
      const account = getTargetAccountKey(request);
      this.logger.warn(
        `Rate limit exceeded for ${ip}${account ? ` (${account})` : ''} - ${request.method} ${request.url}`,
      );
      throw error;
    }
  }
}
