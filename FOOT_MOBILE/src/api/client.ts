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
  if (typeof data === 'object' && data !== null) {
    const obj = data as { message?: unknown; errors?: Record<string, string[]> };
    if (obj.errors && typeof obj.errors === 'object') {
      const errorList = Object.values(obj.errors).flat().filter(Boolean);
      if (errorList.length > 0) return errorList.join(' • ');
    }
    if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message;
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
    const token = await secureStorage.getTokenAsync().catch(() => null);
    // If there was no token (guest browsing), never forcibly redirect to login
    if (!token) return;

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
  return path.includes('/login') || path.includes('/register') || path.includes('/stadiums') || path.includes('/tournaments');
}

import { appLogger } from '@/services/logger/app-logger';

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

  const startTime = Date.now();
  const method = (rest.method || 'GET').toUpperCase();

  try {
    const res = await fetch(url, { ...rest, headers: finalHeaders, body, signal: controller.signal });
    const text = await res.text();
    const duration = Date.now() - startTime;
    appLogger.network(method, path, res.status, duration);

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
    const duration = Date.now() - startTime;
    const status = error instanceof ApiError ? error.status : 0;
    appLogger.network(method, path, status, duration, error);

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

/**
 * Multipart upload via the native Expo File System transport.
 * React Native's fetch+FormData path can fail with "Network request failed"
 * (surfacing as a false "no internet") on device uploads — uploadAsync is the
 * reliable native path. Accepts the same RN FormData the callers already build.
 */
export async function upload<T>(path: string, formData: FormData, opts: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, opts.params);
  const finalHeaders: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  if (opts.auth !== false) {
    const bearer = await getAuthHeader();
    if (bearer) finalHeaders.Authorization = bearer;
  }

  // RN FormData exposes its parts; separate file parts (with a uri) from text fields.
  const parts =
    (formData as unknown as { getParts?: () => Array<Record<string, string>> }).getParts?.() ?? [];
  const filePart = parts.find((p) => p.uri);
  if (!filePart) {
    throw createApiError('No file provided for upload', 0, null, url);
  }
  const parameters: Record<string, string> = {};
  for (const p of parts) {
    if (!p.uri && p.fieldName) parameters[p.fieldName] = p.stringValue ?? p.value ?? '';
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FileSystem = require('expo-file-system') as {
      uploadAsync?: (
        url: string,
        fileUri: string,
        options: {
          uploadType?: unknown;
          fieldName?: string;
          mimeType?: string;
          parameters?: Record<string, string>;
          headers?: Record<string, string>;
        },
      ) => Promise<{ status: number; body: string }>;
      FileSystemUploadType?: { MULTIPART: unknown };
    };
    if (FileSystem.uploadAsync) {
      const res = await FileSystem.uploadAsync(url, filePart.uri, {
        uploadType: FileSystem.FileSystemUploadType?.MULTIPART ?? 'MULTIPART',
        fieldName: filePart.fieldName ?? 'file',
        mimeType: filePart.type ?? 'application/octet-stream',
        parameters,
        headers: finalHeaders,
      });

      const data = parseJsonSafe(res.body);
      if (res.status >= 400) {
        if (res.status === 401 && !isAuthEndpoint(path)) {
          await handleUnauthorized();
        }
        throw createApiError(extractLaravelMessage(data, res.status, ''), res.status, data, url);
      }
      return data as T;
    }
    return request<T>(path, { ...opts, method: 'POST', formData });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    return request<T>(path, { ...opts, method: 'POST', formData });
  }
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
