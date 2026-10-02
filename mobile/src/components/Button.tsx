import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing } from '@/theme';
import { PressableScale } from './ui/PressableScale';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'saffron' | 'ghost' | 'danger' | 'sso';
  icon?: keyof typeof Ionicons.glyphMap;
  customIcon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  customIcon,
  style,
  textStyle,
}: Props) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;
  const isOutlined = variant === 'ghost' || variant === 'sso';
  const foreground = isOutlined ? colors.text : colors.primaryText;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          height: 52,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing(4),
        },
        contentRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        },
        iconGap: { marginRight: spacing(2.5) },
        primary: {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 4,
        },
        // The design system's primary action: blaze (was the darker burnt-orange step).
        saffron: {
          backgroundColor: colors.saffron,
          shadowColor: colors.saffron,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
          elevation: 4,
        },
        sso: {
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1.5,
          borderColor: colors.border,
        },
        danger: { backgroundColor: colors.danger },
        ghost: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.border,
        },
        label: {
          color: foreground,
          fontFamily: fonts.heading,
          fontSize: 16,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }),
    [colors, foreground],
  );

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      // A commit action deserves the heavier tick; ghost/sso are usually
      // secondary paths, so they stay on the light one.
      haptic={isOutlined ? 'tap' : 'press'}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'saffron' && styles.saffron,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        variant === 'sso' && styles.sso,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.contentRow}>
          {customIcon ? (
            <View style={styles.iconGap}>{customIcon}</View>
          ) : icon ? (
            <Ionicons name={icon} size={18} color={foreground} style={styles.iconGap} />
          ) : null}
          <Text style={[styles.label, textStyle]}>{label}</Text>
        </View>
      )}
    </PressableScale>
  );
}
