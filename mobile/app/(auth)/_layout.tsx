import React from 'react';
import { Stack } from 'expo-router';
import { useThemeColors } from '@/ThemeProvider';

export default function AuthLayout() {
  const colors = useThemeColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    />
  );
}
