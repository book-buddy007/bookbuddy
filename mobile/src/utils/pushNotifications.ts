import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { registerDeviceToken } from '@/api/notifications';

// Configure foreground notification behavior for Expo SDK 52
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[Push] Must use physical device for push notifications');
    return null;
  }

  const existingPermissions: any = await Notifications.getPermissionsAsync();
  let isGranted = existingPermissions?.granted ?? existingPermissions?.status === 'granted';

  if (!isGranted) {
    const requestedPermissions: any = await Notifications.requestPermissionsAsync();
    isGranted = requestedPermissions?.granted ?? requestedPermissions?.status === 'granted';
  }

  if (!isGranted) {
    console.warn('[Push] Permission not granted for push notifications');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const deviceName = Device.modelName || `${Platform.OS} device`;

    await registerDeviceToken({
      deviceToken: token,
      platform,
      deviceName,
    });

    console.log('[Push] Registered Expo push token successfully:', token);
    return token;
  } catch (err: any) {
    console.error('[Push] Failed to register push token:', err?.message);
    return null;
  }
}
