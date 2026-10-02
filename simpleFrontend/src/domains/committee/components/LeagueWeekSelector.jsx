import { ChevronLeft, ChevronRight, Calendar, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function LeagueWeekSelector({
  weeks = [],
  activeWeekId,
  onChangeWeek,
  unscheduledCount = 0,
  totalCount = 0,
}) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language.startsWith('ar')

  const currentWeekIndex = weeks.findIndex((w) => w.id === activeWeekId)
  const isUnscheduled = activeWeekId === 'unscheduled'
  const activeWeek = !isUnscheduled && currentWeekIndex !== -1 ? weeks[currentWeekIndex] : null

  const canGoPrev = !isUnscheduled && currentWeekIndex > 0
  const canGoNext = !isUnscheduled && currentWeekIndex < weeks.length - 1

  const handlePrev = () => {
    if (canGoPrev) {
      onChangeWeek(weeks[currentWeekIndex - 1].id)
    }
  }

  const handleNext = () => {
    if (canGoNext) {
      onChangeWeek(weeks[currentWeekIndex + 1].id)
    }
  }

  return (
    <div className="space-y-3 rounded-3xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-sm">
      {/* Top Main Navigation Bar: Prev Arrow, Active Week Pill / Dropdown, Next Arrow */}
      <div className="flex items-center justify-between gap-2">
        {/* Previous Week Button (RTL: points right towards earlier weeks) */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          aria-label={t('committee.detail.prevWeek', 'الأسبوع السابق')}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
            canGoPrev
              ? 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100 shadow-2xs'
              : 'border-slate-100 bg-slate-50/50 text-slate-300 cursor-not-allowed'
          }`}
        >
          {isAr ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>

        {/* Center Week Selector (Clickable / Select Dropdown on Mobile & Desktop) */}
        <div className="relative min-w-0 flex-1">
          <select
            className="w-full appearance-none rounded-2xl border border-emerald-500/30 bg-emerald-50/40 py-2.5 ps-3.5 pe-9 text-center text-xs sm:text-sm font-black text-slate-900 shadow-2xs transition hover:border-emerald-500/60 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            value={activeWeekId}
            onChange={(e) => onChangeWeek(e.target.value)}
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.fullLabel} ({w.count} {isAr ? 'مباراة' : 'matches'})
              </option>
            ))}
            {unscheduledCount > 0 && (
              <option value="unscheduled">
                {isAr ? 'بانتظار البرمجة' : 'Unscheduled'} ({unscheduledCount})
              </option>
            )}
          </select>
          <div className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-emerald-700">
            <Calendar className="size-4 opacity-75" />
          </div>
        </div>

        {/* Next Week Button (RTL: points left towards later weeks) */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          aria-label={t('committee.detail.nextWeek', 'الأسبوع التالي')}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
            canGoNext
              ? 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100 shadow-2xs'
              : 'border-slate-100 bg-slate-50/50 text-slate-300 cursor-not-allowed'
          }`}
        >
          {isAr ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
        </button>
      </div>

      {/* Horizontal Pills for Fast 1-Tap Week Jumping + Dedicated Unscheduled Tab */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
        {weeks.map((w) => {
          const isActive = activeWeekId === w.id
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onChangeWeek(w.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <span>{w.label}</span>
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-500'
              }`}>
                {w.count}
              </span>
            </button>
          )
        })}

        {/* Dedicated Unscheduled Tab / Pill */}
        {unscheduledCount > 0 && (
          <button
            type="button"
            onClick={() => onChangeWeek('unscheduled')}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all ${
              isUnscheduled
                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/40'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertCircle className="size-3.5" />
            <span>{isAr ? 'بدون موعد / بانتظار البرمجة' : 'Unscheduled'}</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
              isUnscheduled ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
            }`}>
              {unscheduledCount}
            </span>
          </button>
        )}
      </div>

      {/* Active Week Date Range Sub-Header */}
      {activeWeek && (
        <div className="flex items-center justify-between border-t border-slate-100/90 pt-2 px-1 text-[11px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="font-black text-emerald-700">{activeWeek.label}:</span>
            <span>{activeWeek.dateRange}</span>
          </div>
          <span className="text-slate-400">
            {activeWeek.count} {isAr ? 'مباراة مجدولة' : 'scheduled'}
          </span>
        </div>
      )}
    </div>
  )
}
