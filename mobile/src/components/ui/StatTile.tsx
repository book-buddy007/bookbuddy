import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing } from '@/theme';
import { PressableScale } from './PressableScale';

export type StatTone = 'primary' | 'teal' | 'gold' | 'success' | 'danger' | 'indigo';

export interface StatTileProps {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: StatTone;
  /** Secondary line — "3 more than last week", "of 12 borrowed". */
  hint?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Single metric tile for dashboards — books read, streak days, pages this week.
 *
 * The value is the largest thing in the tile and the label sits above it in
 * muted small caps, so a row of tiles scans as numbers first. Icon tint carries
 * the tone; the surface stays neutral so several tiles side by side don't turn
 * into a colour chart.
 */
export function StatTile({
  label,
  value,
  icon,
  tone = 'primary',
  hint,
  onPress,
  style,
}: StatTileProps) {
  const colors = useThemeColors();

  const accent = useMemo(() => {
    switch (tone) {
      case 'teal':
        return colors.teal;
      case 'gold':
        return colors.gold;
      case 'success':
        return colors.success;
      case 'danger':
        return colors.danger;
      case 'indigo':
        return colors.indigo;
      default:
        return colors.primary;
    }
  }, [colors, tone]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tile: {
          flex: 1,
          minWidth: 140,
          padding: spacing(4),
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          gap: spacing(1),
        },
        head: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing(2),
        },
        label: {
          fontFamily: fonts.label,
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          color: colors.textMuted,
          flexShrink: 1,
        },
        iconWrap: {
          width: 30,
          height: 30,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
        },
        value: {
          fontFamily: fonts.heading,
          fontSize: 28,
          fontWeight: '800',
          color: colors.text,
          marginTop: spacing(0.5),
        },
        hint: {
          fontFamily: fonts.body,
          fontSize: 12,
          color: colors.textMuted,
        },
      }),
    [colors],
  );

  const content = (
    <>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {icon ? (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={16} color={accent} />
          </View>
        ) : null}
      </View>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.hint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[styles.tile, style]} accessibilityRole="button">
        {content}
      </PressableScale>
    );
  }

  return <View style={[styles.tile, style]}>{content}</View>;
}
