module.exports = ({ config }) => {
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production';

  return {
    ...config,
    name: 'Book Buddy by VPD',
    slug: 'bookbuddyvpd',
    version: '0.1.0',
    // 'default' (not 'portrait') so tablets and foldables can use landscape.
    // A locked portrait orientation is a Google Play large-screen quality
    // violation. Screens that genuinely need a fixed orientation lock it
    // themselves via expo-screen-orientation rather than globally here.
    orientation: 'default',
    scheme: 'bookbuddy',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.vpd.bookbuddy',
    },
    android: {
      package: 'com.vpd.bookbuddy',
      permissions: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.POST_NOTIFICATIONS',
      ],
      adaptiveIcon: {
        backgroundColor: '#0B1120',
      },
      intentFilters: [
        {
          action: 'VIEW',
          data: [
            {
              scheme: 'bookbuddy',
            },
          ],
          category: ['DEFAULT', 'BROWSABLE'],
        },
      ],
    },
    web: {
      bundler: 'metro',
      output: 'single',
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-asset',
      'expo-font',
      'expo-web-browser',
      [
        'expo-build-properties',
        {
          android: {
            // Allow cleartext HTTP traffic for preview/dev builds; require HTTPS in production
            usesCleartextTraffic: !isProduction,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      apiBaseUrl: isProduction
        ? 'https://api.bookbuddy.live'
        : (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3333'),
      // New app: no EAS project yet. Run `npx eas init` in mobile/ once and put
      // the id it prints in EAS_PROJECT_ID (or paste it here).
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  };
};
