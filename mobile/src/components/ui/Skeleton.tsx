import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useThemeColors } from '@/ThemeProvider';
import { radius, spacing } from '@/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  /** Sizes by ratio instead of a fixed height — for cover art placeholders. */
  aspectRatio?: number;
  /** Corner radius. Pass radius.full for avatars. */
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loading placeholder with a slow opacity pulse.
 *
 * Skeletons that mirror the real layout are the difference between "loading"
 * and "broken" — prefer composing these into the shape of the final screen
 * over dropping a centred spinner into an empty page.
 */
export function Skeleton({
  width = '100%',
  height,
  aspectRatio,
  rounded = radius.sm,
  style,
}: SkeletonProps) {
  const colors = useThemeColors();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height: aspectRatio ? undefined : (height ?? 16),
          aspectRatio,
          borderRadius: rounded,
          backgroundColor: colors.surfaceAlt,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Placeholder shaped like a BookCard, for catalog and shelf grids. */
export function BookCardSkeleton() {
  const colors = useThemeColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flex: 1,
          padding: spacing(2.5),
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          gap: spacing(2),
        },
      }),
    [colors],
  );

  return (
    <View style={styles.card}>
      <Skeleton aspectRatio={3 / 4} rounded={radius.sm} />
      <Skeleton width="85%" height={13} />
      <Skeleton width="55%" height={11} />
    </View>
  );
}
