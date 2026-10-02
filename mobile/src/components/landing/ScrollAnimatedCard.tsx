import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { radius, spacing } from '@/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function ScrollAnimatedCard({
  scrollY,
  children,
  style,
}: {
  scrollY: SharedValue<number> | any;
  children: React.ReactNode;
  style?: any;
}) {
  const cardY = useSharedValue(0);
  const cardHeight = useSharedValue(250);
  const hasAnimated = useSharedValue(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    if (y > 0) cardY.value = y;
    if (height > 0) cardHeight.value = height;
  };

  const animatedStyle = useAnimatedStyle(() => {
    if (cardY.value === 0) {
      return { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
    }

    // Trigger point: when card enters top 80% of screen height
    const triggerPoint = cardY.value - SCREEN_HEIGHT * 0.82;
    const isVisible = scrollY.value >= triggerPoint;

    if (isVisible && hasAnimated.value === 0) {
      hasAnimated.value = withTiming(1, {
        duration: 650,
        easing: Easing.out(Easing.cubic),
      });
    }

    const opacity = interpolate(
      hasAnimated.value,
      [0, 1],
      [0.35, 1],
      Extrapolation.CLAMP,
    );

    const translateY = interpolate(
      hasAnimated.value,
      [0, 1],
      [36, 0],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      hasAnimated.value,
      [0, 1],
      [0.94, 1],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  return (
    <View onLayout={handleLayout} style={styles.outerContainer}>
      {/* Back-layer colored depth glow */}
      <View style={styles.glowLayer} />
      <Animated.View style={[styles.card, animatedStyle, style]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
    marginHorizontal: spacing(4),
    marginBottom: spacing(6),
  },
  glowLayer: {
    position: 'absolute',
    top: 6,
    bottom: -6,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 77, 0, 0.14)',
    borderRadius: 24,
    zIndex: -1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 77, 0, 0.25)',
    padding: spacing(5),
    shadowColor: '#0A0F24',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
    overflow: 'hidden',
  },
});
