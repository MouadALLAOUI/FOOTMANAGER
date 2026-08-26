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
};
