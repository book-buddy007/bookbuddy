import React from 'react';
import { Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@/components/Ionicons';
import { useThemeColors } from '@/ThemeProvider';
import { fonts } from '@/theme';
import { useBreakpoint } from '@/utils/useBreakpoint';

/**
 * Main tab shell. Supports guest browsing for the public catalog (index tab),
 * while profile or protected actions handle guest state smoothly.
 *
 * Adaptive navigation: bottom tabs on compact widths, a vertical nav rail on
 * expanded ones. On a tablet in landscape a bottom bar wastes the widest axis
 * and puts targets far from where hands rest, so the bar moves to the side —
 * this is the single biggest layout difference between phone and tablet, and
 * React Navigation supports it natively via `tabBarPosition`.
 */
export default function TabsLayout() {
  const colors = useThemeColors();
  const router = useRouter();
  const { isExpanded } = useBreakpoint();

  return (
    <Tabs
      screenOptions={{
        tabBarPosition: isExpanded ? 'left' : 'bottom',
        // The material variant is the one designed for a side rail; uikit keeps
        // the familiar iOS-style bar on phones.
        tabBarVariant: isExpanded ? 'material' : 'uikit',
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.heading, fontWeight: '800' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderRightColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: fonts.label, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Catalog',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'search' : 'search-outline'}
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'My Library',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'library' : 'library-outline'}
              size={size ?? 22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? 'person-circle' : 'person-circle-outline'}
              size={size ?? 22}
              color={color}
            />
          ),
          // Settings hangs off Profile rather than taking a fifth tab — it is
          // visited rarely, and a five-tab bar crowds a small phone.
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={12}
              style={{ marginRight: 16 }}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Ionicons name="settings-outline" size={21} color={colors.text} />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}
