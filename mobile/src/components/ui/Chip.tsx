import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing } from '@/theme';
import { PressableScale } from './PressableScale';

export type ChipTone = 'neutral' | 'primary' | 'teal' | 'gold' | 'success' | 'danger';

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  /** Filled treatment. Selected chips in a filter row use this. */
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

/** Compact status / filter pill. Static when no `onPress` is given. */
export function Chip({
  label,
  tone = 'neutral',
  selected = false,
  onPress,
  icon,
  style,
}: ChipProps) {
  const colors = useThemeColors();

  const toneColor = useMemo(() => {
    switch (tone) {
      case 'primary':
        return colors.primary;
      case 'teal':
        return colors.teal;
      case 'gold':
        return colors.gold;
      case 'success':
        return colors.success;
      case 'danger':
        return colors.danger;
      default:
        return colors.textMuted;
    }
  }, [colors, tone]);

  const fg = selected ? colors.primaryText : toneColor;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: spacing(1.5),
          paddingHorizontal: spacing(3),
          paddingVertical: spacing(1.5),
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: selected ? toneColor : colors.border,
          backgroundColor: selected ? toneColor : colors.surfaceAlt,
        },
        label: {
          fontFamily: fonts.label,
          fontSize: 12,
          fontWeight: '700',
          color: fg,
        },
      }),
    [colors, fg, selected, toneColor],
  );

  const content = (
    <>
      {icon ? <Ionicons name={icon} size={13} color={fg} /> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  if (!onPress) {
    return <View style={[styles.chip, style]}>{content}</View>;
  }

  return (
    <PressableScale
      onPress={onPress}
      haptic="select"
      style={[styles.chip, style]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {content}
    </PressableScale>
  );
}
