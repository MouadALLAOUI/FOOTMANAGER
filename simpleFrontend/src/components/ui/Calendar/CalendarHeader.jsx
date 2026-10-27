import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'

const VIEWS = [
  { key: 'week', labelKey: 'week' },
  { key: 'day', labelKey: 'day' },
]

export default function CalendarHeader({
  title = '',
  periodLabel = '',
  view = 'week',
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onDateChange,
  dateValue = '',
  weekDisabled = false,
}) {
  const { t } = useTranslation()
  const isWeek = view === 'week'

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-slate-100 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white">
      {/* Stadium info & Period */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <MapPin className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs sm:text-sm font-black text-slate-800">{title || t('terrain.calendar.title')}</p>
          <p className="truncate text-[10px] font-semibold text-slate-400">{periodLabel || '—'}</p>
        </div>
      </div>

      {/* Date navigation controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={onPrevious}
            title={isWeek ? t('terrain.calendar.previousWeek') : t('terrain.calendar.previousDay')}
            className="grid size-7.5 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95"
          >
            <ChevronRight className="size-4 ltr:rotate-180" />
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg px-2.5 py-1 text-[11px] font-black text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
          >
            {t('terrain.calendar.today', 'اليوم')}
          </button>
          <button
            type="button"
            onClick={onNext}
            title={isWeek ? t('terrain.calendar.nextWeek') : t('terrain.calendar.nextDay')}
            className="grid size-7.5 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95"
          >
            <ChevronLeft className="size-4 ltr:rotate-180" />
          </button>
        </div>

        {/* Date picker input */}
        <div className="relative">
          <CalendarDays className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={dateValue}
            onChange={(e) => e.target.value && onDateChange?.(e.target.value)}
            aria-label={t('terrain.calendar.pickDate', 'اختر التاريخ')}
            className="h-8 w-32 rounded-xl border border-slate-200 bg-white px-2 ps-7 text-[11px] font-bold text-slate-700 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 cursor-pointer"
          />
        </div>

        {/* View Mode switcher (Desktop only) */}
        <div className="hidden sm:flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs" role="group" aria-label={t('terrain.calendar.viewMode')}>
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => !weekDisabled && onViewChange?.(v.key)}
              aria-pressed={view === v.key}
              disabled={weekDisabled && v.key === 'week'}
              title={weekDisabled && v.key === 'week' ? t('terrain.calendar.weekUnavailable') : undefined}
              className={`rounded-lg px-3 py-1 text-xs font-black transition-all ${
                view === v.key
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : weekDisabled && v.key === 'week'
                    ? 'cursor-not-allowed text-slate-300'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {t(`terrain.calendar.${v.labelKey}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
