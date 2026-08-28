import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import * as Localization from 'expo-localization';

import { STORAGE_KEYS } from '@/services/storage/keys';
import { persistentStorage } from '@/services/storage/persistent-storage';
import type { SupportedLocale } from '@/types';
import { formatDate as canonicalFormatDate, formatNumber as canonicalFormatNumber, formatRelativeTime as canonicalFormatRelativeTime } from '@/utils/format';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

type Direction = 'ltr' | 'rtl';

const dictionaries: Record<SupportedLocale, Record<string, string>> = {
  ar,
  en,
  fr,
};

function detectDeviceLocale(): SupportedLocale {
  const tag = Localization.getLocales()[0]?.languageTag ?? 'ar';
  if (tag.startsWith('fr')) return 'fr';
  if (tag.startsWith('en')) return 'en';
  return 'ar';
}

function getStoredLocale(): SupportedLocale | null {
  const raw = persistentStorage.getString(STORAGE_KEYS.locale);
  if (raw === 'ar' || raw === 'en' || raw === 'fr') return raw;
  return null;
}

function applyRTL(locale: SupportedLocale): void {
  const shouldBeRTL = locale === 'ar';
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = shouldBeRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
    return;
  }
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(shouldBeRTL);
  }
}

interface I18nContextValue {
  locale: SupportedLocale;
  direction: Direction;
  isRTL: boolean;
  t: (key: string, fallback?: string) => string;
  setLocale: (locale: SupportedLocale) => void;
  formatDate: (value: string | Date, opts?: Intl.DateTimeFormatOptions) => string;
  formatRelativeTime: (value: string | Date) => string;
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => detectDeviceLocale());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = getStoredLocale();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyRTL(locale);
  }, [locale, hydrated]);

  const setLocale = useCallback((next: SupportedLocale) => {
    persistentStorage.setString(STORAGE_KEYS.locale, next);
    applyRTL(next);
    setLocaleState(next);
  }, []);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = dictionaries[locale];
      return dict[key] ?? fallback ?? key;
    },
    [locale],
  );

  const formatDate = useCallback(
    (value: string | Date, opts?: Intl.DateTimeFormatOptions): string =>
      canonicalFormatDate(value, locale, opts),
    [locale],
  );

  const formatRelativeTime = useCallback(
    (value: string | Date): string => canonicalFormatRelativeTime(value, locale),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, opts?: Intl.NumberFormatOptions): string =>
      canonicalFormatNumber(value, locale, opts),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction: locale === 'ar' ? 'rtl' : 'ltr',
      isRTL: locale === 'ar',
      t,
      setLocale,
      formatDate,
      formatRelativeTime,
      formatNumber,
    }),
    [locale, t, setLocale, formatDate, formatRelativeTime, formatNumber],
  );

  return (
    <I18nContext.Provider value={value}>
      <View style={{ flex: 1, direction: value.direction }}>{children}</View>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useTranslation(): I18nContextValue {
  return useI18n();
}
