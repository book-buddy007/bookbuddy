import { apiFetch } from './client';
import type { AppNotification } from './types';

export interface RegisterTokenPayload {
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
}

/**
 * POST /notifications/device-token — registers native push token.
 *
 * `body` is an object: apiFetch serialises it. Pre-stringifying sent a quoted
 * string as the request body, so the DTO never saw `deviceToken` and token
 * registration silently failed on every launch.
 */
export function registerDeviceToken(payload: RegisterTokenPayload) {
  return apiFetch('/notifications/device-token', {
    method: 'POST',
    body: payload,
  });
}

export interface NotificationsResponse {
  data: AppNotification[];
  unreadCount: number;
  userId: string;
}

/** GET /notifications — the 20 most recent, newest first, plus unread count. */
export function getNotifications() {
  return apiFetch<NotificationsResponse>('/notifications');
}

/** DELETE /notifications/device-token/:token — revokes push token on logout */
export function removeDeviceToken(token: string) {
  return apiFetch(`/notifications/device-token/${encodeURIComponent(token)}`, {
    method: 'DELETE',
  });
}

/** POST /notifications/push-test — triggers a test push notification */
export function sendTestPush(title?: string, body?: string) {
  return apiFetch('/notifications/push-test', {
    method: 'POST',
    body: { title, body },
  });
}
