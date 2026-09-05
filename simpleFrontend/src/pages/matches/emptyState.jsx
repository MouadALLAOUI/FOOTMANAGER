import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFutbol, faPlus } from '@fortawesome/free-solid-svg-icons'

const variants = {
  live: {
    title: 'emptyTitle',
    description: 'emptyDescription',
    button: 'emptyButton',
    ring: 'bg-red-50',
    iconColor: 'text-red-300',
  },
  teams: {
    title: 'emptyTitle',
    description: 'emptyDescription',
    button: 'emptyButton',
    ring: 'bg-green-50',
    iconColor: 'text-green-300',
  },
}

export default function EmptyState({ variant, onAction }) {
  const { t } = useTranslation()
  const v = variants[variant] ?? variants.teams

  return (
    <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center md:py-16">
      <div className="relative">
        <span className={`grid size-16 place-items-center rounded-full md:size-24 ${v.ring}`}>
          <FontAwesomeIcon icon={faFutbol} className={`size-8 md:size-12 ${v.iconColor}`} />
        </span>
        <span className="absolute -inset-3 -z-10 rounded-full bg-slate-100" />
      </div>
      <h3 className="mt-5 text-2xl font-black text-slate-900 md:mt-7">
        {t(`matchesPage.${variant}.${v.title}`)}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
        {t(`matchesPage.${variant}.${v.description}`)}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="btn-ripple mt-6 flex h-12 items-center gap-2 rounded-2xl bg-green-500 px-8 text-sm font-bold text-white shadow-[0_12px_30px_rgba(22,163,74,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-700 active:translate-y-0 md:mt-8"
      >
        <FontAwesomeIcon icon={faPlus} className="size-4" />
        {t(`matchesPage.${variant}.${v.button}`)}
      </button>
    </div>
  )
}
