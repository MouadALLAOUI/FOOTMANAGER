/**
 * Secure storage — Phase 1.5
 *
 * expo-secure-store wrapper for tokens and sensitive credentials ONLY
 * (mobile audit S-7: web's localStorage token pattern must never reach mobile).
 *
 * - iOS: Keychain (kSecClassGenericPassword), persists across reinstall w/ same bundle id.
 * - Android: EncryptedSharedPreferences via Keystore.
 * - Web: NOT supported — we throw instead of silently downgrading to
 *   localStorage. Secrets never touch non-secure storage.
 *
 * Keys may contain alphanumerics, '.', '-', '_' (per v57 docs).
 * Keep values small (< ~2KB) — tokens only, never user payloads.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { SECURE_KEYS, type SecureKey } from './keys';

export type SecureStorePlatform = 'ios' | 'android' | 'web';

export function isSecureStorageSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function assertAvailable(): void {
  if (!isSecureStorageSupported()) {
    throw new Error(
      `[secure-storage] SecureStore unavailable on "${Platform.OS}". ` +
        'Secrets are never written to non-secure storage.',
    );
  }
}

export const secureStorage = {
  isSupported: isSecureStorageSupported,

  async getItemAsync(key: SecureKey | string): Promise<string | null> {
    assertAvailable();
    return SecureStore.getItemAsync(key);
  },

  async setItemAsync(key: SecureKey | string, value: string): Promise<void> {
    assertAvailable();
    await SecureStore.setItemAsync(key, value);
  },

  async deleteItemAsync(key: SecureKey | string): Promise<void> {
    assertAvailable();
    await SecureStore.deleteItemAsync(key);
  },

  /** Bearer token accessors — consumed by the auth phase (not implemented yet). */
  async getTokenAsync(): Promise<string | null> {
    return this.getItemAsync(SECURE_KEYS.authToken);
  },
  async setTokenAsync(token: string): Promise<void> {
    await this.setItemAsync(SECURE_KEYS.authToken, token);
  },
  async deleteTokenAsync(): Promise<void> {
    await this.deleteItemAsync(SECURE_KEYS.authToken);
  },

  /**
   * Stable per-install device id.
   *
   * Used for per-device Sanctum token rotation: the backend revokes only the
   * token previously issued for this device id, so other installs stay logged
   * in while re-login on this device rotates its single token.
   *
   * Generated once and persisted in secure storage. Falls back to an ephemereal
   * id if secure storage is unavailable (e.g. web), so login still works.
   */
  async getDeviceIdAsync(): Promise<string> {
    try {
      const existing = await this.getItemAsync(SECURE_KEYS.deviceId);
      if (existing) return existing;
    } catch {
      // Secure store unavailable (e.g. web) — fall through to ephemeral id.
    }

    const id = newRandomId();
    try {
      await this.setItemAsync(SECURE_KEYS.deviceId, id);
    } catch {
      // No durable storage available; ephemereal id is returned anyway.
    }
    return id;
  },
};

function newRandomId(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
