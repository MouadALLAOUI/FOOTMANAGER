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
    <div className="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#1B201D] px-6 py-8 text-center md:py-16">
      <div className="relative">
        <span className={`grid size-16 place-items-center rounded-full md:size-24 ${v.ring}`}>
          <FontAwesomeIcon icon={faFutbol} className={`size-8 md:size-12 ${v.iconColor}`} />
        </span>
        <span className="absolute -inset-3 -z-10 rounded-full bg-slate-100 dark:bg-[#252B27]" />
      </div>
      <h3 className="mt-5 text-2xl font-black text-[#111313] dark:text-[#F5F7F2] md:mt-7">
        {t(`matchesPage.${variant}.${v.title}`)}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#65706A] dark:text-[#B2B9B3]">
        {t(`matchesPage.${variant}.${v.description}`)}
      </p>
      <button
        type="button"
        onClick={onAction}
        className="btn-ripple mt-6 flex h-12 items-center gap-2 rounded-2xl bg-[#B8F000] dark:bg-[#D0FF38] px-8 text-sm font-black text-[#111313] shadow-md transition-all duration-300 hover:brightness-105 active:scale-95 cursor-pointer md:mt-8"
      >
        <FontAwesomeIcon icon={faPlus} className="size-4" />
        {t(`matchesPage.${variant}.${v.button}`)}
      </button>
    </div>
  )
}
