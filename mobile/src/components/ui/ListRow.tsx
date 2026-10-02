import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing } from '@/theme';
import { PressableScale } from './PressableScale';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Overrides `icon` — for an Avatar, cover thumbnail, or custom badge. */
  leading?: React.ReactNode;
  /** Right-hand content: a value, Switch, or Chip. Defaults to a chevron when pressable. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  tone?: 'default' | 'danger';
  /** Hides the bottom hairline — set on the last row of a group. */
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Settings / detail row. Groups of these inside a `Card` give the standard
 * grouped-list look without every screen re-deriving the same paddings.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  leading,
  trailing,
  onPress,
  tone = 'default',
  last = false,
  style,
}: ListRowProps) {
  const colors = useThemeColors();
  const fg = tone === 'danger' ? colors.danger : colors.text;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          paddingVertical: spacing(3.5),
          paddingHorizontal: spacing(1),
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          minHeight: 56,
        },
        iconWrap: {
          width: 36,
          height: 36,
          borderRadius: radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
        },
        text: { flex: 1, gap: spacing(0.5) },
        title: {
          fontFamily: fonts.body,
          fontSize: 15,
          fontWeight: '600',
          color: fg,
        },
        subtitle: {
          fontFamily: fonts.body,
          fontSize: 12,
          color: colors.textMuted,
        },
      }),
    [colors, fg, last],
  );

  const content = (
    <>
      {leading ?? (icon ? (
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={18} color={tone === 'danger' ? colors.danger : colors.primary} />
        </View>
      ) : null)}

      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ??
        (onPress ? (
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        ) : null)}
    </>
  );

  if (!onPress) return <View style={[styles.row, style]}>{content}</View>;

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      style={[styles.row, style]}
      accessibilityRole="button"
    >
      {content}
    </PressableScale>
  );
}
