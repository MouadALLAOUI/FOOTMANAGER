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

export function formatTime(
  value: string | Date,
  locale: SupportedLocale | string = 'ar-MA',
  opts?: Intl.DateTimeFormatOptions,
): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return String(value);
  const tag = localeTag[locale as SupportedLocale] ?? (locale as string);
  try {
    return new Intl.DateTimeFormat(tag, {
      hour: '2-digit',
      minute: '2-digit',
      ...opts,
    }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
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

/**
 * Formats a phone number into pairs of digits separated by a space.
 * e.g. "0123456789" -> "01 23 45 67 89"
 */
export function formatPhoneDisplay(value: string): string {
  if (!value) return '';
  // Keep only digits and limit to 10 digits (standard phone format)
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (!digits) return '';
  const chunks = digits.match(/.{1,2}/g);
  return chunks ? chunks.join(' ') : digits;
}

/**
 * Strips whitespace and formatting characters from a phone number for API submission.
 */
export function cleanPhoneNumber(value: string): string {
  if (!value) return '';
  return value.replace(/\s+/g, '');
}

export interface PasswordStrength {
  score: number; // 0 (empty), 1 (weak), 2 (medium), 3 (strong)
  labelAr: string;
  color: string;
  feedbackAr: string;
}

/**
 * Evaluates password strength:
 * - Weak (score 1, red): < 6 characters or simple digits
 * - Medium (score 2, amber): >= 6 characters with mixed characters or length >= 8
 * - Strong (score 3, green): >= 8 characters with letters, numbers, and special symbols
 */
export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      labelAr: '',
      color: '#E2E8F0',
      feedbackAr: '',
    };
  }

  const length = password.length;
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasDigits = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

  if (length < 6) {
    return {
      score: 1,
      labelAr: 'ضعيفة',
      color: '#EF4444',
      feedbackAr: 'يجب أن تحتوي على 6 أحرف أو أرقام على الأقل',
    };
  }

  let points = 1; // already >= 6 chars

  if (length >= 8) points++;
  if ((hasLetters && hasDigits) || (hasLetters && hasSpecial) || (hasDigits && hasSpecial)) points++;
  if (hasMixedCase || (hasLetters && hasDigits && hasSpecial)) points++;

  if (points >= 3 && length >= 8) {
    return {
      score: 3,
      labelAr: 'قوية',
      color: '#10B981',
      feedbackAr: 'كلمة مرور قوية ومحمية بنجاح ✓',
    };
  }

  if (points >= 2) {
    return {
      score: 2,
      labelAr: 'متوسطة',
      color: '#F59E0B',
      feedbackAr: 'جيدة، أضف أرقاماً أو رموزاً لتصبح قوية',
    };
  }

  return {
    score: 1,
    labelAr: 'ضعيفة',
    color: '#EF4444',
    feedbackAr: 'استخدم 8 أحرف مع أرقام ورموز لحماية أفضل',
  };
}
