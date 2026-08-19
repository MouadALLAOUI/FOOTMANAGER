import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff, ServerCrash, CloudOff, TriangleAlert, RotateCw } from 'lucide-react'
import { ERROR_TYPES } from '../../lib/errorState'

const ICON_BY_TYPE = {
  [ERROR_TYPES.NETWORK]: WifiOff,
  [ERROR_TYPES.SERVER_ERROR]: ServerCrash,
  [ERROR_TYPES.SERVICE_UNAVAILABLE]: CloudOff,
}

const MESSAGE_KEY_BY_TYPE = {
  [ERROR_TYPES.NETWORK]: 'errors.network',
  [ERROR_TYPES.SERVER_ERROR]: 'errors.serverError',
  [ERROR_TYPES.SERVICE_UNAVAILABLE]: 'errors.serviceUnavailable',
}

export default function SectionError({ state, onRetry, message }) {
  const { t } = useTranslation()

  const type = state?.type || ERROR_TYPES.GENERIC
  const Icon = ICON_BY_TYPE[type] || TriangleAlert
  const label = message || (MESSAGE_KEY_BY_TYPE[type] ? t(MESSAGE_KEY_BY_TYPE[type]) : t('errors.generic'))

  const iconClass = useMemo(() => {
    if (type === ERROR_TYPES.NETWORK || type === ERROR_TYPES.SERVICE_UNAVAILABLE) {
      return 'bg-amber-500/10 text-amber-600'
    }
    if (type === ERROR_TYPES.SERVER_ERROR) return 'bg-red-500/10 text-red-500'
    return 'bg-slate-500/10 text-slate-600'
  }, [type])

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center"
    >
      <div className={`grid size-12 place-items-center rounded-full ${iconClass}`}>
        <Icon className="size-6" />
      </div>
      <p className="max-w-sm text-sm font-semibold leading-relaxed text-slate-700">{label}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-green-500 px-5 text-sm font-bold text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500"
        >
          <RotateCw className="size-4" />
          {t('errorPage.retry')}
        </button>
      )}
    </div>
  )
}
