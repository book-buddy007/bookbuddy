import React, { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Ionicons } from '@/components/Ionicons';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius, spacing } from '@/theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export function TextField({
  label,
  error,
  icon,
  isPassword,
  style,
  secureTextEntry,
  ...rest
}: Props) {
  const colors = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isSecure = isPassword ? !showPassword : secureTextEntry;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginBottom: spacing(4.5) },
        label: {
          color: colors.textSecondary,
          fontFamily: fonts.label,
          fontSize: 13,
          marginBottom: spacing(2),
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        inputContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          // Token-driven, not a hardcoded navy: the app defaults to the light
          // theme, where a fixed dark fill made every field look inverted.
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: colors.border,
          height: 52,
          paddingHorizontal: spacing(3.5),
        },
        inputFocused: {
          borderColor: colors.saffron,
          shadowColor: colors.saffron,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
        },
        inputError: { borderColor: colors.danger },
        leadIcon: { marginRight: spacing(2.5) },
        input: {
          flex: 1,
          color: colors.text,
          fontFamily: fonts.body,
          fontSize: 15,
          height: '100%',
        },
        eyeBtn: { padding: spacing(1.5) },
        errorRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          marginTop: spacing(1.5),
        },
        errorText: {
          color: colors.danger,
          fontFamily: fonts.body,
          fontSize: 12,
          fontWeight: '500',
        },
      }),
    [colors],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
      >
        {!!icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? colors.saffron : colors.textMuted}
            style={styles.leadIcon}
          />
        )}
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={[styles.input, style]}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={isSecure}
          {...rest}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {!!error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}
