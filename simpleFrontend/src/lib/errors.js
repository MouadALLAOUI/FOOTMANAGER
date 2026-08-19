import { ERROR_TYPES, mapHttpError } from './errorState'

export function getApiErrorMessage(error, t, fallback) {
  const state = mapHttpError(error)

  switch (state.type) {
    case ERROR_TYPES.UNAUTHORIZED:
      return t('errors.loginRequired')
    case ERROR_TYPES.FORBIDDEN:
      return t('errors.forbidden')
    case ERROR_TYPES.SESSION_EXPIRED:
      return t('errors.sessionExpired')
    case ERROR_TYPES.NOT_FOUND: {
      const backendMessage = error?.response?.data?.message
      return backendMessage || t('errors.notFound')
    }
    case ERROR_TYPES.VALIDATION: {
      const backendMessage = error?.response?.data?.message
      return backendMessage || t('errors.validation')
    }
    case ERROR_TYPES.CONFLICT:
      return t('errors.conflict')
    case ERROR_TYPES.RATE_LIMITED:
      return t('errors.rateLimited')
    case ERROR_TYPES.NETWORK:
      return t('errors.network')
    case ERROR_TYPES.SERVER_ERROR:
    case ERROR_TYPES.SERVICE_UNAVAILABLE:
      return t('errors.serverError')
    default: {
      const backendMessage = error?.response?.data?.message
      if (backendMessage) return backendMessage
      return fallback || t('errors.generic')
    }
  }
}
