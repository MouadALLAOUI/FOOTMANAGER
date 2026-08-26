import { config } from '@/config/env';

import { ApiError, createApiError } from './errors';

export const DEFAULT_TIMEOUT_MS = 15000;

export type RequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  json?: unknown;
  formData?: FormData;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  headers?: Record<string, string>;
  auth?: boolean;
};

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${config.apiUrl}${cleanPath}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function parseJsonSafe(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractLaravelMessage(data: unknown, status: number, statusText: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return `Request failed (${status} ${statusText})`;
}

async function getAuthHeader(): Promise<string | null> {
  try {
    const { secureStorage } = await import('@/services/storage/secure-storage');
    const token = await secureStorage.getTokenAsync();
    return token ? `Bearer ${token}` : null;
  } catch {
    return null;
  }
}

let handling401 = false;

async function handleUnauthorized(): Promise<void> {
  if (handling401) return;
  handling401 = true;
  try {
    const { secureStorage } = await import('@/services/storage/secure-storage');
    await secureStorage.deleteTokenAsync().catch(() => {});
    const { persistentStorage } = await import('@/services/storage/persistent-storage');
    persistentStorage.remove('auth.cachedUser');
    const { queryClient } = await import('./query-client');
    queryClient.clear();
    try {
      const { router } = await import('expo-router');
      router.replace('/(auth)');
    } catch {}
  } finally {
    handling401 = false;
  }
}

function isAuthEndpoint(path: string): boolean {
  return path.includes('/login') || path.includes('/register');
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, formData, params, timeoutMs = DEFAULT_TIMEOUT_MS, headers, auth, ...rest } = options;
  const url = buildUrl(path, params);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const finalHeaders: Record<string, string> = {
    Accept: 'application/json',
    ...headers,
  };

  if (auth !== false) {
    const bearer = await getAuthHeader();
    if (bearer) finalHeaders.Authorization = bearer;
  }

  let body: BodyInit | undefined;
  if (formData !== undefined) {
    body = formData as unknown as BodyInit;
  } else if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
    body = JSON.stringify(json) as BodyInit;
  }

  try {
    const res = await fetch(url, { ...rest, headers: finalHeaders, body, signal: controller.signal });
    const text = await res.text();
    if (res.status === 204) return null as T;
    const data = parseJsonSafe(text);

    if (!res.ok) {
      if (res.status === 401 && !isAuthEndpoint(path)) {
        await handleUnauthorized();
      }
      if (res.status === 403 && !isAuthEndpoint(path)) {
        const d = data as { status?: string; activity_locked?: boolean };
        if (d?.status === 'blocked' || d?.status === 'rejected') {
          await handleUnauthorized();
        }
      }
      throw createApiError(extractLaravelMessage(data, res.status, res.statusText), res.status, data, url);
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401 && !isAuthEndpoint(path)) {
        await handleUnauthorized();
      }
      if (error.status === 403 && !isAuthEndpoint(path)) {
        const d = error.data as { status?: string; activity_locked?: boolean } | null;
        if (d?.status === 'blocked' || d?.status === 'rejected') {
          await handleUnauthorized();
        }
      }
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw createApiError(`Request timed out after ${timeoutMs}ms`, 408, null, url);
    }
    const message = error instanceof Error ? error.message : 'Network error';
    const isNetwork = message.toLowerCase().includes('network') || message.includes('Failed to fetch');
    throw createApiError(isNetwork ? 'Network error' : message, 0, null, url);
  } finally {
    clearTimeout(timeout);
  }
}

export function get<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>(path, { ...opts, method: 'GET' });
}

export function post<T>(path: string, json?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>(path, { ...opts, method: 'POST', json });
}

export function put<T>(path: string, json?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>(path, { ...opts, method: 'PUT', json });
}

export function patch<T>(path: string, json?: unknown, opts?: RequestOptions): Promise<T> {
  return request<T>(path, { ...opts, method: 'PATCH', json });
}

export function del<T>(path: string, opts?: RequestOptions): Promise<T> {
  return request<T>(path, { ...opts, method: 'DELETE' });
}

export function upload<T>(path: string, formData: FormData, opts?: RequestOptions): Promise<T> {
  return request<T>(path, { ...opts, method: 'POST', formData });
}
