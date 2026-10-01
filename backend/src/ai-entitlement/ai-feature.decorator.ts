import { SetMetadata } from '@nestjs/common';

/**
 * Marks a route as a metered AI surface. The AiFeatureGuard reads this to decide
 * (a) whether the caller is entitled to AI at all and (b) which per-feature daily
 * counter to charge a trial call against.
 *
 * The slug is also the `feature` column in AiFeatureUsage, so the five values
 * here are the five daily buckets a trial user gets. Keep them stable — renaming
 * one silently resets that day's counter for every trial user mid-day.
 */
export const AI_FEATURE_KEY = 'aiFeature';

export type AiFeature =
  | 'varta'
  | 'simplify'
  | 'recap'
  | 'quiz'
  | 'visual_grounding';

export const AiFeatureGate = (feature: AiFeature) =>
  SetMetadata(AI_FEATURE_KEY, feature);
