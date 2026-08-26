import type { SupportedLocale } from '@/types';

const localeTag: Record<SupportedLocale, string> = {
  ar: 'ar-MA',
  en: 'en-US',
  fr: 'fr-FR',
};

export function formatDate(
  value: string | Date,
  locale: SupportedLocale | string = 'ar-MA',
  opts?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const tag = localeTag[locale as SupportedLocale] ?? (locale as string);
  try {
    return new Intl.DateTimeFormat(tag, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...opts,
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatRelativeTime(
  value: string | Date,
  locale: SupportedLocale | string = 'ar-MA',
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const tag = localeTag[locale as SupportedLocale] ?? (locale as string);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);
  try {
    if (typeof Intl !== 'undefined' && typeof (Intl as unknown as { RelativeTimeFormat?: unknown }).RelativeTimeFormat !== 'undefined') {
      const rtf = new (Intl as unknown as { RelativeTimeFormat: new (l: string, o: unknown) => { format: (n: number, u: string) => string } }).RelativeTimeFormat(tag, { numeric: 'auto' });
      if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute');
      if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour');
      return rtf.format(-days, 'day');
    }
  } catch {}
  if (Math.abs(minutes) < 60) return `${Math.abs(minutes)}m`;
  if (Math.abs(hours) < 24) return `${Math.abs(hours)}h`;
  return `${Math.abs(days)}d`;
}

export function formatNumber(
  value: number,
  locale: SupportedLocale | string = 'ar-MA',
  opts?: Intl.NumberFormatOptions,
): string {
  const tag = localeTag[locale as SupportedLocale] ?? (locale as string);
  try {
    return new Intl.NumberFormat(tag, opts).format(value);
  } catch {
    return String(value);
  }
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

export function formatBackendContent(value: string): string {
  return value;
}
