/**
 * Persistent (non-secret) storage — Phase 1.5
 *
 * Engine: react-native-mmkv v4 on native development builds (audit lines
 * 864-865); in-memory fallback on web and when MMKV cannot initialize
 * (e.g. Expo Go without a dev build). Secrets NEVER go through here —
 * see ./secure-storage.
 *
 * Feature code imports `persistentStorage` (or typed pref helpers) — it must
 * not import 'react-native-mmkv' or 'expo-secure-store' directly anywhere else.
 */
import { Platform } from 'react-native';

import { createMemoryStorage, type StringKV } from './memory-storage';

export type PersistentBackend = 'mmkv' | 'memory';

interface MmkvInstance {
  getString(key: string): string | undefined;
  set(key: string, value: string | number | boolean): void;
  delete(key: string): void;
  contains(key: string): boolean;
  clearAll(): void;
}

let engine: StringKV | null = null;
let backend: PersistentBackend = 'memory';
let warnedOnce = false;

function ensureEngine(): StringKV {
  if (engine) return engine;

  if (Platform.OS !== 'web') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { MMKV } = require('react-native-mmkv') as {
        MMKV?: new () => MmkvInstance;
      };
      if (!MMKV) throw new Error('react-native-mmkv has no MMKV export');
      const store = new MMKV();
      engine = {
        getString: (key) => store.getString(key) ?? undefined,
        setString: (key, value) => {
          store.set(key, value);
        },
        remove: (key) => {
          store.delete(key);
        },
        contains: (key) => store.contains(key),
        clearAll: () => {
          store.clearAll();
        },
      };
      backend = 'mmkv';
      return engine;
    } catch {
      if (!warnedOnce && __DEV__) {
        warnedOnce = true;
        console.log(
          '[storage] react-native-mmkv unavailable — using in-memory fallback ' +
            '(data will NOT persist; expected in Expo Go). Secrets remain in SecureStore.',
        );
      }
    }
  } else if (!warnedOnce && __DEV__) {
    warnedOnce = true;
    console.log('[storage] Web platform — persistent storage is an in-memory fallback.');
  }

  engine = createMemoryStorage();
  backend = 'memory';
  return engine;
}

/** Which backend is active after first use ('mmkv' or 'memory'). */
export function getPersistentBackend(): PersistentBackend {
  ensureEngine();
  return backend;
}

/**
 * Typed facade over the raw StringKV engine. JSON helpers give structure;
 * bool/number helpers keep call sites clean. `clearAll` is intentionally not
 * exposed — wiping all prefs should be an explicit, reviewed decision.
 */
export const persistentStorage = {
  getJson<T>(key: string): T | null {
    const raw = ensureEngine().getString(key);
    if (raw === undefined) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJson<T>(key: string, value: T): void {
    ensureEngine().setString(key, JSON.stringify(value));
  },

  getBool(key: string): boolean | null {
    const raw = ensureEngine().getString(key);
    if (raw === undefined) return null;
    return raw === 'true';
  },
  setBool(key: string, value: boolean): void {
    ensureEngine().setString(key, value ? 'true' : 'false');
  },

  getNumber(key: string): number | null {
    const raw = ensureEngine().getString(key);
    if (raw === undefined) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  },
  setNumber(key: string, value: number): void {
    ensureEngine().setString(key, String(value));
  },

  getString(key: string): string | undefined {
    return ensureEngine().getString(key);
  },
  setString(key: string, value: string): void {
    ensureEngine().setString(key, value);
  },

  remove(key: string): void {
    ensureEngine().remove(key);
  },
  contains(key: string): boolean {
    return ensureEngine().contains(key);
  },
};
