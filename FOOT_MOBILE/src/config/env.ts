import Constants from 'expo-constants';

export type AppEnv = 'development' | 'preview' | 'production';

export interface AppConfig {
  readonly apiUrl: string;
  readonly env: AppEnv;
  readonly version: string;
  readonly supportContact: string;
}

function parseEnv(raw: string | undefined): AppEnv {
  if (raw === 'preview' || raw === 'production') return raw;
  return 'development';
}

function validateApiUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(
      '[env] EXPO_PUBLIC_API_URL is empty — set it in .env (see .env.example). ' +
        'Example: EXPO_PUBLIC_API_URL=http://192.168.1.6/api',
    );
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      `[env] EXPO_PUBLIC_API_URL is not a valid URL: "${trimmed}" — ` +
        'must start with http:// or https:// and include /api path',
    );
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(
      `[env] EXPO_PUBLIC_API_URL must use http:// or https:// — got "${url.protocol}"`,
    );
  }
  return trimmed.replace(/\/+$/, '');
}

let cached: AppConfig | null = null;

export function getAppConfig(): AppConfig {
  if (cached) return cached;

  const extra = (Constants.expoConfig?.extra ?? {}) as {
    apiUrl?: string;
    appEnv?: string;
  };

  const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? extra.apiUrl;
  if (!rawApiUrl) {
    throw new Error(
      '[env] Missing API URL — set EXPO_PUBLIC_API_URL in .env (see .env.example). ' +
        'For local dev: EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8000/api',
    );
  }

  const apiUrl = validateApiUrl(rawApiUrl);
  const env = parseEnv(process.env.EXPO_PUBLIC_APP_ENV ?? extra.appEnv);
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const supportContact = (process.env.EXPO_PUBLIC_SUPPORT_CONTACT ?? '').trim();

  cached = { apiUrl, env, version, supportContact };
  return cached;
}

export function getApiUrl(): string {
  return getAppConfig().apiUrl;
}

export function getSupportContact(): string {
  return getAppConfig().supportContact;
}

export function getAppEnv(): AppEnv {
  return getAppConfig().env;
}

export function isDevelopment(): boolean {
  return getAppEnv() === 'development';
}

export function isPreview(): boolean {
  return getAppEnv() === 'preview';
}

export function isProduction(): boolean {
  return getAppEnv() === 'production';
}

export const config = {
  get apiUrl(): string {
    return getAppConfig().apiUrl;
  },
  get env(): AppEnv {
    return getAppConfig().env;
  },
  get version(): string {
    return getAppConfig().version;
  },
  get isDevelopment(): boolean {
    return isDevelopment();
  },
  get isPreview(): boolean {
    return isPreview();
  },
  get isProduction(): boolean {
    return isProduction();
  },
} as const;

export function resetConfigCache(): void {
  cached = null;
}
