import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { del, post } from '@/api/client';

let cachedToken: string | null = null;

function isSupportedPlatform(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function resolveProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ??
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId
  );
}

/**
 * Wire the foreground handler, create the Android channel and (optionally)
 * prompt for permission. Safe to call on every cold start.
 */
export async function initializePushNotifications(): Promise<void> {
  if (!isSupportedPlatform()) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notification',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
      sound: 'default',
    });
  } catch {
    // Channel setup may fail on simulators without a channel infrastructure.
  }
}

export async function hasPushPermission(): Promise<boolean> {
  if (!isSupportedPlatform()) return false;

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;

  const requested = await Notifications.requestPermissionsAsync();

  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * Ask for permission (when needed) and return the Expo push token, or null if
 * permission was denied / the platform is unsupported / the token API failed.
 * Never throws — callers treat push as best-effort.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;

  if (!(await hasPushPermission())) return null;

  try {
    const projectId = resolveProjectId();
    const response = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : {});
    cachedToken = response.data;

    return cachedToken;
  } catch {
    return null;
  }
}

/**
 * Register the current device token with the backend. Used right after login
 * and on session restore so the server always has a fresh token.
 */
export async function registerCurrentDevice(): Promise<void> {
  if (!isSupportedPlatform()) return;

  try {
    const token = await getExpoPushToken();
    if (!token) return;

    await post('/devices', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
  } catch {
    // Offline or API hiccup — the device stays unregistered until next login.
  }
}

/**
 * Tell the backend this device no longer receives push. Used on logout.
 */
export async function unregisterCurrentDevice(): Promise<void> {
  if (!isSupportedPlatform()) return;

  try {
    const token = cachedToken ?? (await getExpoPushToken());
    if (!token) return;

    await del('/devices', { json: { token } });
  } catch {
    // Best-effort; stale tokens are cleaned up by the backend on 410s anyway.
  } finally {
    cachedToken = null;
  }
}

export function resetPushTokenCache(): void {
  cachedToken = null;
}