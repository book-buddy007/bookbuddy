import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokens, ThemeMode, Tokens } from './tokens';
import { makeColors, ColorTokens } from './theme';

const STORAGE_KEY = '@book_buddy_theme_mode';

interface ThemeContextValue {
  themeMode: ThemeMode;
  theme: Tokens;
  colors: ColorTokens;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

// Default LIGHT so mobile matches the web app's appearance out of the box.
const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'light',
  theme: tokens.light,
  colors: makeColors('light'),
  setThemeMode: () => {},
  toggleTheme: () => {},
  isDark: false,
});

export function MobileThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      // A user's explicit choice wins; otherwise default to light (web parity)
      // rather than following the system, so the two apps look identical.
      if (saved === 'light' || saved === 'dark') {
        setThemeModeState(saved);
      }
    });
  }, [systemColorScheme]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  };

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        theme: tokens[themeMode],
        colors: makeColors(themeMode),
        setThemeMode,
        toggleTheme,
        isDark: themeMode === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useMobileTheme = () => useContext(ThemeContext);

/** Reactive color set for ported screens (respects the light/dark toggle). */
export const useThemeColors = (): ColorTokens => useContext(ThemeContext).colors;
