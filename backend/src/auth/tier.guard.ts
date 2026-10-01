import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TIER_KEY, TIER_RANK, SubscriptionTier } from './tier.decorator';

@Injectable()
export class TierGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredTier = this.reflector.getAllAndOverride<SubscriptionTier>(
      TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredTier) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userTier: string = request.user?.subscriptionTier ?? 'FREE';

    if ((TIER_RANK[userTier] ?? 0) < TIER_RANK[requiredTier]) {
      throw new ForbiddenException(
        `${requiredTier} tier required for this feature. Upgrade your plan.`,
      );
    }

    return true;
  }
}
