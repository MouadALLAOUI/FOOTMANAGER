import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faFutbol } from '@fortawesome/free-solid-svg-icons'
import { useTranslation } from 'react-i18next'

const chipIcons = {
  city: faLocationDot,
  date: faFutbol,
  time: faFutbol,
  type: faFutbol,
}

export default function ResultSummary({ count, from, to, activeFilters }) {
  const { t } = useTranslation()

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900">
            {t('fieldsPage.summary.found', { count })}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {t('fieldsPage.summary.showing', { from, to, total: count })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(({ key, label, onRemove }) => (
            <button
              key={key}
              type="button"
              onClick={onRemove}
              className="group flex items-center gap-2 rounded-full bg-slate-100 py-2 pe-3 ps-4 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-200"
            >
              <FontAwesomeIcon icon={chipIcons[key] ?? faFutbol} className="size-3.5 text-slate-400" />
              {label}
              <span className="grid size-4 place-items-center rounded-full bg-slate-400 text-[10px] text-white transition-colors group-hover:bg-green-500">
                ×
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
