import { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';

import { getAppConfig } from '@/config/env';

SplashScreen.preventAutoHideAsync().catch(() => {});

export function useAppBootstrap(): { isReady: boolean; error: string | null; retry: () => void } {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const bootstrap = useCallback(async () => {
    try {
      setError(null);
      getAppConfig();
      setIsReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initialize app');
      setIsReady(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void bootstrap();
  }, [bootstrap, attempt]);

  useEffect(() => {
    if (isReady || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isReady, error]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { isReady, error, retry };
}
