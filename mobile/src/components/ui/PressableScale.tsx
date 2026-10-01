import React, { useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { PRESS_SCALE, haptics, spring } from '@/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type HapticKind = 'tap' | 'press' | 'select' | 'none';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Haptic fired on press. Default 'tap'; pass 'none' inside dense lists. */
  haptic?: HapticKind;
  /** Scale the element settles to while held. */
  scaleTo?: number;
}

/**
 * The app's single press primitive: a spring scale-down plus a haptic tick.
 *
 * Every tappable surface should route through this rather than styling
 * `Pressable`'s `pressed` flag with an opacity change — opacity flicker reads
 * as cheap, and inconsistent press feedback is the most common reason an app
 * feels unfinished.
 */
export function PressableScale({
  children,
  style,
  haptic = 'tap',
  scaleTo = PRESS_SCALE,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      scale.value = withSpring(scaleTo, spring.snappy);
      if (haptic !== 'none') haptics[haptic]();
      onPressIn?.(event);
    },
    [haptic, onPressIn, scale, scaleTo],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      scale.value = withSpring(1, spring.snappy);
      onPressOut?.(event);
    },
    [onPressOut, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle, disabled && { opacity: 0.5 }]}
    >
      {children as React.ReactNode}
    </AnimatedPressable>
  );
}
