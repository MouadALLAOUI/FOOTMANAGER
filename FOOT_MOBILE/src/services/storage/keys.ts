/**
 * Storage keys — Phase 1.5
 *
 * Two strictly separated categories (mobile audit S-7):
 * - SECURE_KEYS   -> expo-secure-store ONLY (iOS Keychain / Android Keystore).
 *                    Tokens and credentials. NEVER written anywhere else.
 * - STORAGE_KEYS  -> persistent KV storage (expo-sqlite kv-store). Preferences,
 *                    locale, non-sensitive cache only.
 */
export const SECURE_KEYS = {
  /** Sanctum bearer token — written during the auth phase, never here. */
  authToken: 'fm.secure.auth_token',
  /** Stable per-install device id used for per-device token rotation. */
  deviceId: 'fm.secure.device_id',
} as const;

export const STORAGE_KEYS = {
  /** Active UI language: 'ar' | 'en' */
  locale: 'prefs.locale',
  /** User-forced color scheme: 'light' | 'dark' | null = follow system */
  colorSchemeOverride: 'prefs.colorSchemeOverride',
  /** Onboarding seen flag */
  hasOnboarded: 'prefs.hasOnboarded',
  /** Non-sensitive user snapshot for fast boot paint (audit line 863) */
  cachedUser: 'auth.cachedUser',
  /** Last dashboard the signed-in role landed on */
  lastActiveRole: 'auth.lastActiveRole',
} as const;

export type SecureKey = (typeof SECURE_KEYS)[keyof typeof SECURE_KEYS];
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Self-test keys — always removed again after verification runs. */
export const SELF_TEST_PREFIX = 'selftest.';
export const SECURE_SELF_TEST_KEY = 'fm.secure.selftest';
