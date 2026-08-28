import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter, type Href } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { deepLinkTarget, parseDeepLink } from '@/navigation/linking';

/**
 * Mounted once at the root layout. Handles `footmanager://` deep links:
 * - warm starts via `Linking.addEventListener('url')`
 * - cold starts (app launched by an external URL) via `Linking.getInitialURL()`
 *
 * If the session is still restoring or the user is signed out, navigation is
 * deferred until the session reports `authenticated`.
 */
export function DeepLinkBootstrap(): null {
  const router = useRouter();
  const { role, sessionState } = useAuth();
  const pendingRef = useRef<Href | null>(null);

  useEffect(() => {
    let active = true;

    function handleUrl(url: string | null): void {
      if (!url) return;
      const parsed = parseDeepLink(url);
      if (!parsed) return;
      const target = deepLinkTarget(parsed, role);
      if (!target) return;

      if (sessionState === 'authenticated') {
        router.navigate(target);
      } else {
        pendingRef.current = target;
      }
    }

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    void Linking.getInitialURL().then((url) => {
      if (active) handleUrl(url);
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