import { Calendar, Plus, Trophy, Unlink } from 'lucide-react'

export default function DaySelectorBar({
  days = [],
  unscheduledCount = 0,
  totalCount = 0,
  selectedDayKey = 'all',
  onSelectDay,
  onAddDay,
}) {
  return (
    <div className="min-w-0 max-w-full rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-2.5 sm:p-3 shadow-2xs">
      <div className="flex items-stretch gap-2 overflow-x-auto no-scrollbar pb-0.5 max-w-full">
        {/* All Days Chip */}
        <button
          type="button"
          onClick={() => onSelectDay?.('all')}
          className={`flex min-w-[82px] shrink-0 flex-col items-start justify-between rounded-xl border px-3 py-2 text-start transition cursor-pointer active:scale-[0.98] ${
            selectedDayKey === 'all'
              ? 'border-[#111313] dark:border-[#D0FF38] bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
              : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] hover:bg-[#E9ECE7] dark:hover:bg-[#303832]'
          }`}
        >
          <span className="flex items-center gap-1 text-xs font-black">
            <Calendar className="size-3.5 shrink-0" />
            <span>الكل</span>
          </span>
          <span
            className={`mt-1.5 text-[11px] font-black tabular-nums ${
              selectedDayKey === 'all' ? 'text-[#111313]/85' : 'text-[#65706A] dark:text-[#B2B9B3]'
            }`}
          >
            {totalCount} مباراة
          </span>
        </button>

        {/* Chronological Tournament Days with Group Color Dots */}
        {days.map((day) => {
          const active = selectedDayKey === day.dateKey
          const meta = day.meta
          return (
            <button
              key={day.dateKey}
              type="button"
              onClick={() => onSelectDay?.(day.dateKey)}
              className={`flex min-w-[126px] sm:min-w-[140px] shrink-0 flex-col justify-between gap-1.5 rounded-xl border px-3 py-2 text-start transition cursor-pointer active:scale-[0.98] ${
                active
                  ? 'border-[#111313] dark:border-[#D0FF38] bg-[#B8F000]/22 dark:bg-[#D0FF38]/16 ring-1 ring-[#B8F000] dark:ring-[#D0FF38] shadow-2xs'
                  : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/70 dark:bg-[#252B27]/80 hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-1.5">
                <span className="text-[11px] font-black text-[#111313] dark:text-[#F5F7F2] truncate">
                  {day.isCustomEmpty ? 'يوم مضاف' : meta.dayTitle}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black font-mono tabular-nums ${
                    active
                      ? 'bg-[#111313] dark:bg-[#D0FF38] text-white dark:text-[#111313]'
                      : 'bg-white dark:bg-[#1B201D] text-[#65706A] dark:text-[#B2B9B3] border border-[#E1E5DF] dark:border-[#303832]'
                  }`}
                >
                  {day.matchCount}
                </span>
              </div>

              <div className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] truncate">
                {meta.weekday ? `${meta.weekday} · ` : ''}
                {meta.shortDate}
              </div>

              {/* Group Color Indicator Dots Row */}
              <div className="flex items-center gap-1 min-h-[12px]" aria-label="المجموعات المبرمجة في هذا اليوم">
                {day.groupDots.length > 0 ? (
                  day.groupDots.map((gd) => (
                    <span
                      key={gd.key}
                      title={gd.label}
                      className="inline-flex items-center gap-0.5 rounded-full bg-white/80 dark:bg-[#1B201D]/90 px-1 py-0.2 border border-black/5 dark:border-white/10"
                    >
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: gd.hex }} />
                      {gd.shortCode && gd.shortCode !== '—' && (
                        <span className="text-[9px] font-black text-[#111313] dark:text-[#F5F7F2] leading-none">
                          {gd.shortCode}
                        </span>
                      )}
                    </span>
                  ))
                ) : day.hasKnockout ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400">
                    <Trophy className="size-2.5" />
                    <span>إقصائي</span>
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-[#65706A]/75 dark:text-[#B2B9B3]/75">
                    بدون مباريات بعد
                  </span>
                )}
                {day.hasKnockout && day.groupDots.length > 0 && (
                  <Trophy className="size-2.5 text-amber-500 shrink-0" title="أدوار إقصائية" />
                )}
              </div>
            </button>
          )
        })}

        {/* Unscheduled Fixtures Chip (if any) */}
        {unscheduledCount > 0 && (
          <button
            type="button"
            onClick={() => onSelectDay?.('unscheduled')}
            className={`flex min-w-[110px] shrink-0 flex-col justify-between gap-1 rounded-xl border px-3 py-2 text-start transition cursor-pointer active:scale-[0.98] ${
              selectedDayKey === 'unscheduled'
                ? 'border-amber-500 bg-amber-500/15 dark:bg-amber-500/20 text-[#111313] dark:text-[#F5F7F2]'
                : 'border-amber-300/60 dark:border-amber-700/60 bg-amber-50/70 dark:bg-amber-950/25 text-amber-900 dark:text-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="flex items-center gap-1 text-[11px] font-black">
                <Unlink className="size-3 shrink-0" />
                <span>بدون موعد</span>
              </span>
              <span className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-black text-white tabular-nums">
                {unscheduledCount}
              </span>
            </div>
            <span className="text-[10px] font-semibold opacity-80">بانتظار تحديد اليوم</span>
          </button>
        )}

        {/* Quick Add Target Programming Day Chip */}
        {onAddDay && (
          <button
            type="button"
            onClick={onAddDay}
            className="flex min-w-[78px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/60 dark:bg-[#252B27]/50 px-3 py-2 text-[#111313] dark:text-[#F5F7F2] hover:border-[#1F9D55] dark:hover:border-[#D0FF38] hover:bg-[#B8F000]/10 transition cursor-pointer active:scale-[0.98]"
            title="إضافة يوم برمجة جديد وتصفح/نقل المباريات إليه"
          >
            <Plus className="size-4 text-[#1F9D55] dark:text-[#D0FF38]" />
            <span className="text-[11px] font-black whitespace-nowrap">إضافة يوم</span>
          </button>
        )}
      </div>
    </div>
  )
}
