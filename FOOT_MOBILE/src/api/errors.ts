export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'rateLimit'
  | 'server'
  | 'unknown';

export class ApiError extends Error {
  readonly status: number;
  readonly data: unknown;
  readonly url: string;
  readonly kind: ApiErrorKind;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    data: unknown,
    url: string,
    kind: ApiErrorKind = 'unknown',
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.url = url;
    this.kind = kind;
    this.fieldErrors = fieldErrors;
  }
}

function classifyStatus(status: number): ApiErrorKind {
  if (status === 0) return 'network';
  if (status === 408) return 'timeout';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 422) return 'validation';
  if (status === 429) return 'rateLimit';
  if (status >= 500) return 'server';
  if (status >= 400) return 'unknown';
  return 'unknown';
}

export function createApiError(
  message: string,
  status: number,
  data: unknown,
  url: string,
): ApiError {
  const kind = classifyStatus(status);
  let fieldErrors: Record<string, string[]> | undefined;
  if (kind === 'validation' && typeof data === 'object' && data !== null && 'errors' in data) {
    const raw = (data as { errors?: unknown }).errors;
    if (raw && typeof raw === 'object') {
      fieldErrors = raw as Record<string, string[]>;
    }
  }
  return new ApiError(message, status, data, url, kind, fieldErrors);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && (error.kind === 'network' || error.kind === 'timeout');
}

export function isValidationError(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'validation';
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'unauthorized';
}

export function isForbiddenError(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'forbidden';
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'notFound';
}

export function isServerError(error: unknown): boolean {
  return error instanceof ApiError && error.kind === 'server';
}

export function getValidationErrors(error: unknown): Record<string, string[]> | null {
  if (error instanceof ApiError && error.fieldErrors) return error.fieldErrors;
  return null;
}

export function getFirstValidationMessage(
  error: unknown,
  fallback = 'Validation failed',
): string | null {
  const errors = getValidationErrors(error);
  if (!errors) return null;
  const first = Object.values(errors)[0];
  if (!first) return null;
  return Array.isArray(first) ? (first[0] ?? fallback) : String(first);
}

export function getUserMessage(error: unknown, fallback = 'حدث خطأ غير متوقع'): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return 'لا يوجد اتصال بالإنترنت';
    if (error.kind === 'timeout') return 'انتهت مهلة الطلب، حاول مرة أخرى';
    if (error.kind === 'unauthorized') return 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً';
    if (error.kind === 'forbidden') return 'ليس لديك صلاحية لهذا الإجراء';
    if (error.kind === 'notFound') return 'المورد غير موجود';
    if (error.kind === 'rateLimit') return 'عدد كبير من الطلبات، حاول لاحقاً';
    if (error.kind === 'server') return 'خطأ في الخادم، حاول لاحقاً';
    if (error.kind === 'validation') {
      const msg = getFirstValidationMessage(error);
      if (msg) return msg;
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export function getApiErrorMessage(error: unknown, fallback = 'حدث خطأ غير متوقع'): string {
  return getUserMessage(error, fallback);
}
