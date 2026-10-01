import { Platform } from 'react-native';
import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

/**
 * One set of springs and durations for the whole app.
 *
 * Polish reads as "designed" when every screen shares the same physics — a
 * press on a book card, a sheet sliding up and a tab switching should all feel
 * like the same object. Per-screen improvised timings are what make an app feel
 * assembled from parts, so reach for these instead of inline configs.
 *
 * All presets honour the OS "reduce motion" accessibility setting.
 */

export const spring = {
  /** Default for press feedback and small transforms. Settles fast, no wobble. */
  snappy: {
    damping: 20,
    stiffness: 260,
    mass: 0.9,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,

  /** Sheets, drawers, anything travelling a long distance. */
  gentle: {
    damping: 26,
    stiffness: 160,
    mass: 1,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,

  /** Celebratory moments only — streak hit, badge earned. Used sparingly. */
  bouncy: {
    damping: 12,
    stiffness: 220,
    mass: 0.8,
    reduceMotion: ReduceMotion.System,
  } satisfies WithSpringConfig,
} as const;

export const timing = {
  fast: {
    duration: 150,
    easing: Easing.out(Easing.quad),
    reduceMotion: ReduceMotion.System,
  } satisfies WithTimingConfig,

  base: {
    duration: 240,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    reduceMotion: ReduceMotion.System,
  } satisfies WithTimingConfig,

  slow: {
    duration: 420,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    reduceMotion: ReduceMotion.System,
  } satisfies WithTimingConfig,
} as const;

/** Scale a pressable settles to while held. */
export const PRESS_SCALE = 0.97;

export const pressIn = () => withSpring(PRESS_SCALE, spring.snappy);
export const pressOut = () => withSpring(1, spring.snappy);
export const fadeTo = (value: number) => withTiming(value, timing.fast);

/**
 * Layout-animation presets for list and screen entrances.
 *
 * `stagger(index)` offsets each row so a list arrives as a wave rather than all
 * at once. Cap the index at ~8 so long lists don't accumulate a visible delay.
 */
export const entrance = {
  screen: FadeIn.duration(timing.base.duration),
  card: FadeInDown.duration(timing.base.duration).springify().damping(18),
  stagger: (index: number) =>
    FadeInDown.delay(Math.min(index, 8) * 40)
      .duration(timing.base.duration)
      .springify()
      .damping(18),
  exit: FadeOut.duration(timing.fast.duration),
  /** Apply to containers whose children reorder or resize. */
  layout: LinearTransition.springify().damping(22).stiffness(180),
} as const;

/**
 * Haptics wrapper.
 *
 * Every call is fire-and-forget and swallows failures: haptics are unavailable
 * on web and on some emulators, and a missing vibration motor must never
 * surface as an error in a user flow.
 */
const hapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

function safely(run: () => Promise<unknown>): void {
  if (!hapticsSupported) return;
  run().catch(() => {});
}

export const haptics = {
  /** Primary button, card open, confirm. */
  tap: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Heavier commitment: borrow a book, submit a form. */
  press: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Moving between segments, tabs, or picker values. */
  select: () => safely(() => Haptics.selectionAsync()),
  success: () =>
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () =>
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () =>
    safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
} as const;
