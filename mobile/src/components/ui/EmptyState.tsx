import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import Animated from 'react-native-reanimated';
import { useThemeColors } from '@/ThemeProvider';
import { entrance } from '@/motion';
import { fonts, radius, spacing } from '@/theme';
import { Button } from '../Button';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  /** One sentence on why it's empty and what to do — not just "No data". */
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Renders in the error tone. */
  tone?: 'neutral' | 'danger';
  style?: StyleProp<ViewStyle>;
}

/**
 * Empty and error placeholder.
 *
 * Every empty state should offer a way forward — an empty shelf links to the
 * catalog, a failed load offers retry. A dead end with no action is the single
 * most common UX failure in a library app, because "no results" is a normal
 * state rather than an exceptional one.
 */
export function EmptyState({
  icon = 'sparkles-outline',
  title,
  body,
  actionLabel,
  onAction,
  tone = 'neutral',
  style,
}: EmptyStateProps) {
  const colors = useThemeColors();
  const accent = tone === 'danger' ? colors.danger : colors.primary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing(8),
          paddingVertical: spacing(10),
          gap: spacing(2),
        },
        iconWrap: {
          width: 72,
          height: 72,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing(2),
        },
        title: {
          fontFamily: fonts.heading,
          fontSize: 18,
          fontWeight: '800',
          color: colors.text,
          textAlign: 'center',
        },
        body: {
          fontFamily: fonts.body,
          fontSize: 14,
          lineHeight: 21,
          color: colors.textMuted,
          textAlign: 'center',
          maxWidth: 340,
        },
        action: { marginTop: spacing(4), minWidth: 200 },
      }),
    [colors],
  );

  return (
    <Animated.View entering={entrance.card} style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant={tone === 'danger' ? 'ghost' : 'primary'}
          style={styles.action}
        />
      ) : null}
    </Animated.View>
  );
}
