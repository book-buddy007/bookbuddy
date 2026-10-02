import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  FamiljenGrotesk_400Regular,
  FamiljenGrotesk_500Medium,
  FamiljenGrotesk_600SemiBold,
  FamiljenGrotesk_700Bold,
} from '@expo-google-fonts/familjen-grotesk';
import { Newsreader_400Regular, Newsreader_500Medium, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';
import { AuthProvider } from '@/store/AuthContext';
import { TenantProvider } from '@/store/TenantContext';
import { MobileThemeProvider, useMobileTheme } from '@/ThemeProvider';
import { setupPushNotificationsAsync } from '@/utils/pushNotifications';
import { fonts } from '@/theme';

// Keep the splash visible until the shared fonts are ready, so the first paint
// already uses the design-system faces (Bricolage / Familjen / Newsreader, matching web).
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 min stale time for offline caching
      gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24h
    },
  },
});

import { useOfflineProgressSync } from '@/hooks/useOfflineProgressSync';

/**
 * Navigator lives in its own component so it can read the theme from context —
 * screen options set from the static `colors` export would not repaint when the
 * user toggles light/dark.
 */
function RootNavigator() {
  const { colors, isDark } = useMobileTheme();
  useOfflineProgressSync();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.heading, fontWeight: '800' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Account flows render their own headers inside AuthShell. */}
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="pending-approval" options={{ headerShown: false }} />
        <Stack.Screen name="delete-account" options={{ headerShown: false }} />
        <Stack.Screen name="flashcards/index" options={{ title: 'Flashcards' }} />
        <Stack.Screen name="flashcards/[deckId]" options={{ title: 'Review' }} />
        <Stack.Screen name="vocabulary" options={{ title: 'Word list' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="institutions/index" options={{ title: 'Institutions' }} />
        <Stack.Screen name="personal-library/index" options={{ title: 'My files' }} />
        <Stack.Screen
          name="personal-library/read/[fileId]"
          options={{ title: 'My file' }}
        />
        <Stack.Screen
          name="book/[id]"
          options={{ title: 'Book', presentation: 'card' }}
        />
        <Stack.Screen
          name="reader/[id]"
          options={{
            title: 'Secure Reader',
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{ title: 'Varta', presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    FamiljenGrotesk_400Regular,
    FamiljenGrotesk_500Medium,
    FamiljenGrotesk_600SemiBold,
    FamiljenGrotesk_700Bold,
    Newsreader_400Regular,
    Newsreader_500Medium,
    Newsreader_600SemiBold,
  });

  useEffect(() => {
    setupPushNotificationsAsync().catch((err) => {
      console.log('[Push] Notification setup skipped on simulator/web:', err?.message);
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    // Required for the gesture-driven surfaces in the UI kit (BottomSheet's
    // drag-to-dismiss). Without this root view, pan gestures silently no-op.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <MobileThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <TenantProvider>
                <RootNavigator />
              </TenantProvider>
            </AuthProvider>
          </QueryClientProvider>
        </MobileThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
