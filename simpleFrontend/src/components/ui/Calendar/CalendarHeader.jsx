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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-green-50 text-green-600">
          <MapPin className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-800">{title || t('terrain.calendar.title')}</p>
          <p className="truncate text-[10px] font-semibold text-slate-400">{periodLabel || '—'}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={onPrevious}
          title={isWeek ? t('terrain.calendar.previousWeek') : t('terrain.calendar.previousDay')}
          className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <ChevronRight className="size-4 ltr:rotate-180" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="rounded-lg px-2.5 py-1 text-[11px] font-extrabold text-slate-600 transition-colors hover:bg-slate-50 hover:text-green-600"
        >
          {t('terrain.calendar.today')}
        </button>
        <button
          type="button"
          onClick={onNext}
          title={isWeek ? t('terrain.calendar.nextWeek') : t('terrain.calendar.nextDay')}
          className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
        >
          <ChevronLeft className="size-4 ltr:rotate-180" />
        </button>
      </div>

      <div className="relative">
        <CalendarDays className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="date"
          value={dateValue}
          onChange={(e) => e.target.value && onDateChange?.(e.target.value)}
          aria-label={t('terrain.calendar.pickDate')}
          className="h-8 w-36 rounded-lg border border-slate-200 bg-white px-2 ps-8 text-[11px] font-bold text-slate-600 outline-none transition-all focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
        />
      </div>

      <div className="ms-auto flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label={t('terrain.calendar.viewMode')}>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => !weekDisabled && onViewChange?.(v.key)}
            aria-pressed={view === v.key}
            disabled={weekDisabled && v.key === 'week'}
            title={weekDisabled && v.key === 'week' ? t('terrain.calendar.weekUnavailable') : undefined}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
              view === v.key
                ? 'bg-green-500 text-white shadow-sm'
                : weekDisabled && v.key === 'week'
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
          >
            {t(`terrain.calendar.${v.labelKey}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
