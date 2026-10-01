import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeColors } from '@/ThemeProvider';
import { fonts, radius } from '@/theme';

export interface AvatarProps {
  name?: string | null;
  uri?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Initials from a display name: "Gopal V Arora" -> "GA". */
function initialsOf(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, uri, size = 44, style }: AvatarProps) {
  const colors = useThemeColors();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          width: size,
          height: size,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        image: { width: size, height: size },
        initials: {
          fontFamily: fonts.heading,
          fontWeight: '800',
          fontSize: size * 0.36,
          color: colors.primary,
        },
      }),
    [colors, size],
  );

  return (
    <View style={[styles.base, style]}>
      {uri ? (
        <Image source={{ uri }} style={styles.image} resizeMode="cover" />
      ) : (
        <Text style={styles.initials}>{initialsOf(name)}</Text>
      )}
    </View>
  );
}
