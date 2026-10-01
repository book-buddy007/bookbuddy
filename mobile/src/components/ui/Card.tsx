import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/ThemeProvider';
import { radius, spacing } from '@/theme';
import { PressableScale } from './PressableScale';

export type CardVariant = 'solid' | 'glass' | 'outline' | 'accent';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  /** Makes the card tappable, with the shared press-scale + haptic. */
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Base surface. `accent` adds a saffron left edge for cards that need to pull
 * focus (an overdue item, an active streak) — use it for at most one card in
 * any given view, or it stops meaning anything.
 */
export function Card({
  children,
  variant = 'solid',
  onPress,
  padded = true,
  style,
  accessibilityLabel,
}: CardProps) {
  const colors = useThemeColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        },
        padded: { padding: spacing(4) },
        glass: {
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.border,
        },
        outline: {
          backgroundColor: 'transparent',
          borderColor: colors.border,
        },
        accent: {
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        },
      }),
    [colors],
  );

  const composed = [
    styles.base,
    variant === 'glass' && styles.glass,
    variant === 'outline' && styles.outline,
    variant === 'accent' && styles.accent,
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        style={composed}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={composed}>{children}</View>;
}
