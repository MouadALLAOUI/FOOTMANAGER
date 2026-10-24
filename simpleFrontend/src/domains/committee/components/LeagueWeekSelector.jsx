import { ChevronLeft, ChevronRight, Calendar, AlertCircle, Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function LeagueWeekSelector({
  weeks = [],
  activeWeekId,
  onChangeWeek,
  unscheduledCount = 0,
  totalCount = 0,
  onOpenFilterSheet,
}) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language?.startsWith('ar')

  const currentWeekIndex = weeks.findIndex((w) => w.id === activeWeekId)
  const isUnscheduled = activeWeekId === 'unscheduled'
  const isAll = activeWeekId === 'all'
  const activeWeek = !isUnscheduled && !isAll && currentWeekIndex !== -1 ? weeks[currentWeekIndex] : null

  // In RTL:
  // Prev button (Earlier week): can go if currentWeekIndex > 0
  // Next button (Later week): can go if currentWeekIndex < weeks.length - 1
  const canGoPrev = !isUnscheduled && !isAll && currentWeekIndex > 0
  const canGoNext = !isUnscheduled && !isAll && currentWeekIndex < weeks.length - 1

  const handlePrev = () => {
    if (canGoPrev) {
      onChangeWeek(weeks[currentWeekIndex - 1].id)
    } else if (isAll && weeks.length > 0) {
      onChangeWeek(weeks[0].id)
    }
  }

  const handleNext = () => {
    if (canGoNext) {
      onChangeWeek(weeks[currentWeekIndex + 1].id)
    } else if (isAll && weeks.length > 0) {
      onChangeWeek(weeks[0].id)
    }
  }

  return (
    <div className="rounded-2xl border border-[#D7E0EA] bg-white p-2.5 sm:p-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        {/* Previous Week Button (RTL: points right) */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev && !isAll}
          aria-label={t('committee.detail.prevWeek', 'الأسبوع السابق')}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 ${
            canGoPrev || isAll
              ? 'border-[#D7E0EA] bg-[#F3F6FA] text-[#102A43] hover:bg-slate-200 hover:border-slate-300'
              : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'
          }`}
        >
          {isAr ? <ChevronRight className="size-5 stroke-[2.5]" /> : <ChevronLeft className="size-5 stroke-[2.5]" />}
        </button>

        {/* Center Stepper Display (Tappable to open filter sheet or show week info) */}
        <button
          type="button"
          onClick={onOpenFilterSheet}
          className="group min-w-0 flex-1 flex flex-col items-center justify-center py-1 px-2 rounded-xl transition hover:bg-slate-50 cursor-pointer"
        >
          {isAll ? (
            <>
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-[#102A43]">
                <Layers className="size-4 text-[#00C853]" />
                <span>{isAr ? 'كل الأسابيع' : 'All Weeks'}</span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-[#52657A] mt-0.5">
                {isAr ? 'عرض جدول مباريات البطولة بالكامل' : 'Showing all fixtures'}
              </p>
              <span className="inline-block mt-0.5 text-[11px] font-black text-[#008F46]">
                {totalCount} {isAr ? 'مباراة' : 'matches'}
              </span>
            </>
          ) : isUnscheduled ? (
            <>
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-amber-700">
                <AlertCircle className="size-4 text-amber-600" />
                <span>{isAr ? 'بانتظار البرمجة' : 'Unscheduled'}</span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-[#52657A] mt-0.5">
                {isAr ? 'مباريات غير محددة الموعد' : 'Matches waiting for schedule'}
              </p>
              <span className="inline-block mt-0.5 text-[11px] font-black text-amber-800">
                {unscheduledCount} {isAr ? 'مباراة' : 'matches'}
              </span>
            </>
          ) : activeWeek ? (
            <>
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-[#102A43]">
                <Calendar className="size-4 text-[#00C853]" />
                <span>{activeWeek.label}</span>
              </div>
              <p className="text-[11px] sm:text-xs font-semibold text-[#52657A] mt-0.5 dir-rtl">
                {activeWeek.dateRange}
              </p>
              <span className="inline-block mt-0.5 text-[11px] font-black text-[#008F46]">
                {activeWeek.count} {isAr ? 'مباريات' : 'matches'}
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-black text-[#102A43]">
                <Layers className="size-4 text-[#00C853]" />
                <span>{isAr ? 'كل الأسابيع' : 'All Weeks'}</span>
              </div>
              <span className="inline-block mt-0.5 text-[11px] font-black text-[#008F46]">
                {totalCount} {isAr ? 'مباراة' : 'matches'}
              </span>
            </>
          )}
        </button>

        {/* Next Week Button (RTL: points left) */}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext && !isAll}
          aria-label={t('committee.detail.nextWeek', 'الأسبوع التالي')}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all active:scale-95 ${
            canGoNext || isAll
              ? 'border-[#D7E0EA] bg-[#F3F6FA] text-[#102A43] hover:bg-slate-200 hover:border-slate-300'
              : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'
          }`}
        >
          {isAr ? <ChevronLeft className="size-5 stroke-[2.5]" /> : <ChevronRight className="size-5 stroke-[2.5]" />}
        </button>
      </div>
    </div>
  )
}
