/**
 * Central QueryClient — Phase 1.5
 *
 * Defaults mirror simpleFrontend/src/api/queryClient.js (staleTime 60s,
 * gcTime 5m, retry 2 + exponential delay capped at 30s, mutations never
 * retry) so cache semantics stay compatible across platforms — adapted for
 * native, not blindly copied:
 * - 4xx ApiErrors (except timeout 408) are NOT retried: on mobile they burn
 *   battery/data and can't succeed. Network (status 0), timeouts and 5xx retry.
 * - refetchOnWindowFocus is meaningless on native; kept false for web parity.
 * - Central QueryCache/MutationCache onError hooks give one choke point for
 *   future Toast/Sentry wiring (Phase 2+); dev builds log via console.warn.
 */
import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError, getApiErrorMessage, isNetworkError } from './errors';

export const QUERY_STALE_TIME_MS = 60_000;
export const QUERY_GC_TIME_MS = 5 * 60_000;
export const MAX_QUERY_RETRIES = 2;

/** Web parity: Math.min(1000 * 2**attempt, 30000). */
export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}

/**
 * Retry policy: up to MAX_QUERY_RETRIES attempts, skipping deterministic
 * client errors (4xx except 408 timeout) and rate limits (429).
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false;
  if (error instanceof ApiError) {
    if (error.status === 429) return false;
    if (error.status >= 400 && error.status < 500 && error.status !== 408) return false;
  }
  return true;
}

function logCacheError(scope: 'query' | 'mutation', error: unknown): void {
  if (isNetworkError(error)) return;
  if (__DEV__) {
    console.warn(`[react-query:${scope}] ${getApiErrorMessage(error)}`, error);
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      gcTime: QUERY_GC_TIME_MS,
      retry: shouldRetryQuery,
      retryDelay: queryRetryDelay,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
    mutations: {
      retry: 0,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => logCacheError('query', error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => logCacheError('mutation', error),
  }),
});
