import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { del, post } from '@/api/client';

type NotificationsModule = typeof import('expo-notifications');

let cachedToken: string | null = null;
let notificationsModule: NotificationsModule | null = null;

function isExpoGoAndroid(): boolean {
  return (
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient && Platform.OS === 'android'
  );
}

/**
 * expo-notifications throws at import time inside Expo Go on Android
 * (remote push was removed from Expo Go in SDK 53) — so the module must
 * never even be evaluated there. A guarded require() keeps the module body
 * unevaluated in Expo Go while loading normally in dev/production builds.
 */
function loadNotifications(): NotificationsModule | null {
  if (isExpoGoAndroid()) return null;
  if (!notificationsModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
  }
  return notificationsModule;
}

/**
 * true when push APIs are usable on this platform/build combination.
 * false in Expo Go on Android (SDK 53+ removed remote push there).
 */
export function isPushSupported(): boolean {
  return loadNotifications() !== null;
}

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

  const Notifications = loadNotifications();
  if (!Notifications) return;

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

  const Notifications = loadNotifications();
  if (!Notifications) return false;

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
    const Notifications = loadNotifications();
    if (!Notifications) return null;

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

/** Sync accessor for callers that need the module (listener registration). */
export { loadNotifications };
