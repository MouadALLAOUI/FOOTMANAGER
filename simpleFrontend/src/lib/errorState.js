export const ERROR_TYPES = {
  NOT_FOUND: 'notFound',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  SESSION_EXPIRED: 'sessionExpired',
  VALIDATION: 'validation',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rateLimited',
  SERVER_ERROR: 'serverError',
  SERVICE_UNAVAILABLE: 'serviceUnavailable',
  NETWORK: 'network',
  GENERIC: 'generic',
}

const ERROR_TYPE_BY_STATUS = {
  401: ERROR_TYPES.UNAUTHORIZED,
  403: ERROR_TYPES.FORBIDDEN,
  404: ERROR_TYPES.NOT_FOUND,
  409: ERROR_TYPES.CONFLICT,
  419: ERROR_TYPES.SESSION_EXPIRED,
  422: ERROR_TYPES.VALIDATION,
  429: ERROR_TYPES.RATE_LIMITED,
  500: ERROR_TYPES.SERVER_ERROR,
  502: ERROR_TYPES.SERVICE_UNAVAILABLE,
  503: ERROR_TYPES.SERVICE_UNAVAILABLE,
}

function retryAfterOf(error) {
  const headers = error?.response?.headers || {}
  const body = error?.response?.data || {}
  const value = headers['retry-after'] ?? body.retry_after ?? body.seconds ?? body.retry_after_seconds
  if (value == null || value === '') return null
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : null
}

export function mapHttpError(error) {
  if (!error) return { type: ERROR_TYPES.GENERIC }

  const status = error.response?.status

  if (!status) {
    if (error.request && error.code !== 'ERR_CANCELED') {
      return { type: ERROR_TYPES.NETWORK }
    }
    return { type: ERROR_TYPES.GENERIC }
  }

  const type = ERROR_TYPE_BY_STATUS[status] || ERROR_TYPES.GENERIC

  if (type === ERROR_TYPES.VALIDATION) {
    return {
      type,
      status,
      errors: error.response?.data?.errors || {},
    }
  }

  if (type === ERROR_TYPES.RATE_LIMITED) {
    return {
      type,
      status,
      retryAfter: retryAfterOf(error),
    }
  }

  return { type, status }
}

export function getFieldErrors(error) {
  const state = mapHttpError(error)
  return state.type === ERROR_TYPES.VALIDATION ? state.errors : {}
}

export function isNetworkError(error) {
  return mapHttpError(error).type === ERROR_TYPES.NETWORK
}
