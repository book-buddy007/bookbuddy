import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AiEntitlementService } from './ai-entitlement.service';
import { AI_FEATURE_KEY, AiFeature } from './ai-feature.decorator';

/**
 * Gate for metered AI surfaces. Replaces the old `@RequiresTier('DIAMOND')` on
 * the RAG routes: instead of demanding a paid tier outright, it also admits a
 * user on an active free trial and, for those, charges the call against their
 * per-feature daily allowance.
 *
 * A route without `@AiFeatureGate(...)` is not metered and passes straight
 * through, so putting this in the guard chain is harmless for un-annotated
 * handlers — the metadata is what turns it on.
 *
 * The 403 body deliberately names the trial: the frontend keys off it to show
 * the "Start free trial" button exactly where the block happened.
 */
@Injectable()
export class AiFeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private entitlement: AiEntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<AiFeature>(AI_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Not a metered route — nothing to enforce.
    if (!feature) return true;

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id;
    // BetterAuthGuard runs before this and already 401s the unauthenticated, so a
    // missing id here means the guard order is wrong — fail closed rather than
    // silently letting an un-identified caller through the meter.
    if (!userId) {
      throw new ForbiddenException('Authentication required for AI features.');
    }

    const access = await this.entitlement.resolveAccess(userId);
    if (!access.hasAccess) {
      throw new ForbiddenException({
        message:
          'AI features need an active subscription or free trial. ' +
          'Start your free trial to use Varta and the other study tools.',
        // A stable code the client can branch on without string-matching the copy.
        reason: 'TRIAL_REQUIRED',
      });
    }

    // Paid/entitled users are not metered; only trials draw down a daily bucket.
    if (access.isTrial) {
      const usage = await this.entitlement.consumeFeatureQuota(userId, feature);
      // Surface the remaining allowance to the handler / response if it wants it.
      req.aiUsage = usage;
    }

    return true;
  }
}
