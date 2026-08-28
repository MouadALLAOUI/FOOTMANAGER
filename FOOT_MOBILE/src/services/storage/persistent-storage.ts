/**
 * Persistent (non-secret) storage — Phase 1.5
 *
 * Engine: expo-sqlite KV store (SQLite-backed, synchronous API). Works in Expo
 * Go AND native dev builds, persists across restarts. In-memory fallback on
 * web (wasm sqlite is not bundled here) and when SQLite cannot initialize.
 * Secrets NEVER go through here — see ./secure-storage.
 *
 * Feature code imports `persistentStorage` (or typed pref helpers) — it must
 * not import 'expo-sqlite' or 'expo-secure-store' directly anywhere else.
 */
import { Platform } from 'react-native';

import { createMemoryStorage, type StringKV } from './memory-storage';

export type PersistentBackend = 'sqlite' | 'memory';

interface SqliteKvLike {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
  removeItemSync(key: string): boolean;
  clearSync(): boolean;
}

let engine: StringKV | null = null;
let backend: PersistentBackend = 'memory';
let warnedOnce = false;

function ensureEngine(): StringKV {
  if (engine) return engine;

  if (Platform.OS !== 'web') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sqliteKv = require('expo-sqlite/kv-store').default as SqliteKvLike;
      if (!sqliteKv?.setItemSync) throw new Error('expo-sqlite kv-store has no sync API');
      engine = {
        getString: (key) => sqliteKv.getItemSync(key) ?? undefined,
        setString: (key, value) => {
          sqliteKv.setItemSync(key, value);
        },
        remove: (key) => {
          sqliteKv.removeItemSync(key);
        },
        contains: (key) => sqliteKv.getItemSync(key) !== null,
        clearAll: () => {
          sqliteKv.clearSync();
        },
      };
      backend = 'sqlite';
      return engine;
    } catch {
      if (!warnedOnce && __DEV__) {
        warnedOnce = true;
        console.log('[storage] expo-sqlite unavailable — using in-memory fallback (will not persist).');
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

/** Which backend is active after first use ('sqlite' or 'memory'). */
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
