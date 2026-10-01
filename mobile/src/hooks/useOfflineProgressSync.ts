import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncProgress, ProgressSyncPayload } from '../api/reader';

// Bumped after the 2026-08-06 identity/content reset: bookId and userId
// values in production were reissued, so anything still queued under the old
// key would replay stale ids against the reset system. The old key is simply
// never read again -- discardOldQueue() below drops it once, for hygiene,
// but the version bump alone is what stops the replay.
const QUEUE_STORAGE_KEY = '@book_buddy_offline_progress_queue_v2';
const STALE_QUEUE_KEY = '@book_buddy_offline_progress_queue';

type ProgressQueue = Record<string, ProgressSyncPayload>;

/** One-time cleanup of the pre-reset queue key. Never read, only removed. */
async function discardStaleQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STALE_QUEUE_KEY);
  } catch {
    // best-effort; the version bump is what actually matters
  }
}

/**
 * Queue a progress sync payload in AsyncStorage to be sent when back online.
 */
export async function queueOfflineProgress(payload: ProgressSyncPayload): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const queue: ProgressQueue = raw ? JSON.parse(raw) : {};
    
    // Store latest payload for this bookId (overwriting any stale update)
    queue[payload.bookId] = {
      ...(queue[payload.bookId] || {}),
      ...payload,
    };

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.warn('[OfflineSync] Failed to queue progress update:', err);
  }
}

/**
 * Attempt to flush queued progress payloads to the server.
 */
export async function flushOfflineProgressQueue(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return;

    const queue: ProgressQueue = JSON.parse(raw);
    const bookIds = Object.keys(queue);
    if (bookIds.length === 0) return;

    const remainingQueue: ProgressQueue = { ...queue };

    for (const bookId of bookIds) {
      const payload = queue[bookId];
      try {
        await syncProgress(payload);
        delete remainingQueue[bookId];
      } catch (err) {
        // Keep in queue if sync fails (e.g., still offline)
        console.warn(`[OfflineSync] Sync failed for book ${bookId}, keeping in queue.`);
      }
    }

    if (Object.keys(remainingQueue).length > 0) {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remainingQueue));
    } else {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('[OfflineSync] Failed to flush progress queue:', err);
  }
}

/**
 * Safe wrapper for syncProgress that queues the payload on network failure.
 */
export async function syncProgressWithOfflineFallback(payload: ProgressSyncPayload) {
  try {
    return await syncProgress(payload);
  } catch (err) {
    console.warn('[OfflineSync] Network error on syncProgress, stashing offline payload:', err);
    await queueOfflineProgress(payload);
    return null;
  }
}

/**
 * Hook to automatically attempt flushing offline progress when app transitions to active foreground.
 */
export function useOfflineProgressSync() {
  useEffect(() => {
    discardStaleQueue();
    // Attempt initial flush on mount
    flushOfflineProgressQueue();

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        flushOfflineProgressQueue();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);
}
