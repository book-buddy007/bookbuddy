import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useThemeColors } from '@/ThemeProvider';
import { haptics, spring } from '@/motion';
import { fonts, radius, spacing } from '@/theme';
import { PressableScale } from './PressableScale';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Tab-like switch for 2–4 mutually exclusive views (All / Reading / Finished).
 *
 * The selected pill springs between positions rather than cutting, which is
 * what makes the control feel physical. Falls back gracefully before first
 * layout by rendering the pill at the measured width of zero.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const colors = useThemeColors();
  const [trackWidth, setTrackWidth] = useState(0);

  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segmentWidth = options.length > 0 ? trackWidth / options.length : 0;

  const indicatorStyle = useAnimatedStyle(
    () => ({
      width: segmentWidth,
      transform: [{ translateX: withSpring(index * segmentWidth, spring.snappy) }],
    }),
    [index, segmentWidth],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          flexDirection: 'row',
          padding: spacing(0.75),
          borderRadius: radius.full,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          position: 'relative',
        },
        indicator: {
          position: 'absolute',
          top: spacing(0.75),
          left: spacing(0.75),
          bottom: spacing(0.75),
          borderRadius: radius.full,
          backgroundColor: colors.primary,
        },
        segment: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: spacing(2),
          borderRadius: radius.full,
        },
        label: {
          fontFamily: fonts.label,
          fontSize: 13,
          fontWeight: '700',
          color: colors.textMuted,
        },
        labelActive: { color: colors.primaryText },
      }),
    [colors],
  );

  function handleLayout(event: LayoutChangeEvent) {
    // Subtract the track's own padding so the pill lines up with the segments.
    setTrackWidth(event.nativeEvent.layout.width - spacing(1.5));
  }

  return (
    <View style={[styles.track, style]} onLayout={handleLayout}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <PressableScale
            key={option.value}
            haptic="none"
            scaleTo={0.98}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              haptics.select();
              onChange(option.value);
            }}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
