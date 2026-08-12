import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFutbol } from '@fortawesome/free-solid-svg-icons'

export default function EmptyState({ onReset }) {
  const { t } = useTranslation()

  return (
    <div className="mt-8 flex flex-col items-center justify-center rounded-[28px] bg-white px-6 py-20 text-center shadow-[0_16px_50px_rgba(17,24,39,0.08)] ring-1 ring-slate-100">
      <span className="grid size-24 place-items-center rounded-full bg-green-50">
        <FontAwesomeIcon icon={faFutbol} className="size-12 text-green-300" />
      </span>
      <h3 className="mt-8 text-2xl font-black text-slate-900">{t('fieldsPage.empty.title')}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {t('fieldsPage.empty.description')}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="btn-ripple mt-8 flex h-12 items-center rounded-2xl bg-green-500 px-8 text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-700 active:translate-y-0"
      >
        {t('fieldsPage.empty.button')}
      </button>
    </div>
  )
}
