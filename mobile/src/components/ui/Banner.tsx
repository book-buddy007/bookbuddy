import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useThemeColors } from '@/ThemeProvider';
import { entrance } from '@/motion';
import { fonts, radius, spacing } from '@/theme';

export type BannerTone = 'info' | 'success' | 'warning' | 'danger';

export interface BannerProps {
  tone?: BannerTone;
  /** Optional bold first line. Without it the banner is a single message row. */
  title?: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Extra content under the message — a retry button, for example. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ICONS: Record<BannerTone, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle-outline',
  success: 'checkmark-circle-outline',
  warning: 'alert-circle-outline',
  danger: 'warning-outline',
};

/**
 * Inline status message for forms — validation failures, "check your inbox"
 * confirmations, expired-token warnings.
 *
 * Tinted background at low opacity with a solid icon, rather than a coloured
 * border alone, so the tone is legible in both themes.
 */
export function Banner({
  tone = 'info',
  title,
  message,
  icon,
  children,
  style,
}: BannerProps) {
  const colors = useThemeColors();

  const accent = useMemo(() => {
    switch (tone) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'danger':
        return colors.danger;
      default:
        return colors.teal;
    }
  }, [colors, tone]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          gap: spacing(2.5),
          padding: spacing(3.5),
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: accent,
          backgroundColor: colors.surfaceAlt,
          marginBottom: spacing(4),
        },
        content: { flex: 1, gap: spacing(1) },
        title: {
          fontFamily: fonts.heading,
          fontSize: 14,
          fontWeight: '800',
          color: colors.text,
        },
        message: {
          fontFamily: fonts.body,
          fontSize: 13,
          lineHeight: 19,
          color: colors.textSecondary,
        },
      }),
    [accent, colors],
  );

  return (
    <Animated.View entering={entrance.card} style={[styles.wrap, style]}>
      <Ionicons name={icon ?? DEFAULT_ICONS[tone]} size={18} color={accent} />
      <View style={styles.content}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <Text style={styles.message}>{message}</Text>
        {children}
      </View>
    </Animated.View>
  );
}
