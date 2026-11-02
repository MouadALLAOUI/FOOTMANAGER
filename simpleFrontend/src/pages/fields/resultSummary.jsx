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
          <h2 className="text-2xl font-black text-[#111313] dark:text-[#D0FF38]">
            {t('fieldsPage.summary.found', { count })}
          </h2>
          <p className="mt-1 text-sm text-[#65706A] dark:text-[#B2B9B3]">
            {t('fieldsPage.summary.showing', { from, to, total: count })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map(({ key, label, onRemove }) => (
            <button
              key={key}
              type="button"
              onClick={onRemove}
              className="group flex items-center gap-2 rounded-full bg-slate-100 dark:bg-[#252B27] py-2 pe-3 ps-4 text-sm font-semibold text-slate-700 dark:text-[#F5F7F2] border border-[#E1E5DF] dark:border-[#303832] transition-all duration-300 hover:bg-slate-200 dark:hover:bg-[#303832] cursor-pointer"
            >
              <FontAwesomeIcon icon={chipIcons[key] ?? faFutbol} className="size-3.5 text-[#65706A] dark:text-[#B2B9B3]" />
              {label}
              <span className="grid size-4 place-items-center rounded-full bg-slate-400 dark:bg-[#303832] text-[10px] text-white transition-colors group-hover:bg-[#16834A] dark:group-hover:bg-[#D0FF38] dark:group-hover:text-[#101211]">
                ×
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
