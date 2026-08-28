import { useEffect, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { notificationTarget, type AppNotification, type NotificationCategory } from '@/api/notifications';
import { useAuth } from '@/auth/AuthProvider';
import { initializePushNotifications } from '@/services/notifications/push-notifications';

/**
 * Mounted once at the root layout. Owns the push notification handler setup
 * and routes the user to the in-app destination when a push is tapped —
 * including cold starts (the app launched by tapping the notification).
 */
export function PushNotificationsBootstrap(): null {
  const router = useRouter();
  const { role, sessionState } = useAuth();
  const pendingRef = useRef<Href | null>(null);

  useEffect(() => {
    void initializePushNotifications();
  }, []);

  useEffect(() => {
    let active = true;

    function routeFrom(data: Record<string, unknown> | null | undefined): void {
      const category = data?.category as NotificationCategory | undefined;
      if (!category) return;

      const target = notificationTarget(
        { category, data: (data ?? {}) as AppNotification['data'] },
        role,
      );
      if (!target) return;

      if (sessionState === 'authenticated') {
        router.navigate(target);
      } else {
        // Auth still restoring / not signed in yet — navigate once ready.
        pendingRef.current = target;
      }
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFrom(response.notification.request.content.data);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || !response) return;
      routeFrom(response.notification.request.content.data);
    });

    return () => {
      active = false;
      sub.remove();
    };
  }, [router, role, sessionState]);

  useEffect(() => {
    if (sessionState !== 'authenticated' || !pendingRef.current) return;
    const target = pendingRef.current;
    pendingRef.current = null;
    router.navigate(target);
  }, [router, sessionState]);

  return null;
}