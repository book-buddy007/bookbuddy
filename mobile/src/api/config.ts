import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Base URL of the shared Book Buddy NestJS backend — the SAME API and database
 * used by the web app. Native apps talk to it directly (no Next.js proxy,
 * no WebView).
 *
 * Resolution order:
 *   1. EXPO_PUBLIC_API_BASE_URL env var (set in .env / EAS secrets)
 *   2. `extra.apiBaseUrl` in app.json
 *   3. Platform-aware localhost default for development
 *
 * Dev note: the Android emulator cannot reach the host machine via
 * `localhost` — it maps the host to 10.0.2.2. iOS simulator can use
 * localhost directly. On a physical device, set EXPO_PUBLIC_API_BASE_URL
 * to your machine's LAN IP (e.g. http://192.168.1.20:3333).
 */
function resolveBaseUrl(): string {
  // Support both EXPO_PUBLIC_API_URL and EXPO_PUBLIC_API_BASE_URL
  const fromEnv =
    process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;

  // In development mode (__DEV__), avoid defaulting to the production domain
  if (__DEV__) {
    // If env var is set to a local URL (or LAN IP), use it directly
    if (fromEnv && !fromEnv.includes('api.bookbuddy.vinstitution.com')) {
      return fromEnv.replace(/\/$/, '');
    }

    // Try LAN IP from Expo Constants if running on a physical device via Expo Go
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.15:8081"
    if (hostUri && !fromEnv) {
      const lanIp = hostUri.split(':')[0];
      if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
        return `http://${lanIp}:3333`;
      }
    }

    // Platform-aware development defaults
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3333';
    }
    return 'http://localhost:3333';
  }

  // Production environment resolution
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const fromExtra = (
    Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined
  )?.apiBaseUrl;

  if (fromExtra) {
    return fromExtra.replace(/\/$/, '');
  }

  return 'https://api.bookbuddy.vinstitution.com';
}

export const API_BASE_URL = resolveBaseUrl();

if (__DEV__) {
  console.log(`[API Config] Active Base URL: ${API_BASE_URL}`);
}

