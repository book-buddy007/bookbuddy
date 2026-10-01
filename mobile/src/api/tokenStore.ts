import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Persists the Better Auth session token securely.
 *
 * On iOS/Android this uses the device Keychain / Keystore via
 * expo-secure-store. On web (Expo web) SecureStore is unavailable, so we
 * fall back to localStorage — acceptable for dev, and web ultimately uses
 * the cookie-based session anyway.
 */
const TOKEN_KEY = 'bookbuddy.session_token';

export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
