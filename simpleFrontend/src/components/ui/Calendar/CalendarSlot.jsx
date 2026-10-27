import { useTranslation } from 'react-i18next'
import { Lock, Plus } from 'lucide-react'

export default function CalendarSlot({ slot, top, height, onClick }) {
  const { t } = useTranslation()
  const isPast = slot.metadata?.isPast

  if (slot.status === 'closed') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={slot.metadata?.closureReason || t('terrain.calendar.closed')}
        className="absolute inset-x-1 flex cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200/90 bg-slate-100/60 text-slate-400 transition-colors hover:bg-slate-100 hover:border-slate-300"
        style={{ top, height }}
      >
        {height >= 28 && (
          <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
            <Lock className="size-2.5 opacity-60" />
            <span className="truncate max-w-[90px]">{slot.metadata?.closureReason || t('terrain.calendar.closed', 'مغلق')}</span>
          </span>
        )}
      </button>
    )
  }

  if (isPast) {
    return (
      <div
        className="absolute inset-x-1 flex items-center justify-center overflow-hidden rounded-lg border border-slate-100/70 bg-slate-50/40 text-slate-300 select-none pointer-events-none"
        style={{ top, height }}
      >
        {height >= 32 && (
          <span className="text-[8px] font-semibold text-slate-300 opacity-60">{slot.startTime}</span>
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${slot.startTime} - ${slot.endTime} (${t('terrain.calendar.available', 'متاح للحجز')})`}
      className="group absolute inset-x-1 flex items-center justify-center overflow-hidden rounded-lg border border-emerald-100/40 bg-emerald-50/15 transition-all hover:border-emerald-400 hover:bg-emerald-50/80 hover:shadow-xs active:scale-[0.99] cursor-pointer"
      style={{ top, height }}
    >
      {/* Corner subtle hour hint */}
      <span className="absolute top-1 start-1.5 text-[8px] font-semibold text-slate-300 opacity-60 transition-opacity group-hover:text-emerald-600 group-hover:opacity-100">
        {slot.startTime}
      </span>

      {/* Hover action pill */}
      <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-white/90 px-2 py-0.5 rounded-md shadow-2xs border border-emerald-200/80">
        <Plus className="size-3" />
        <span>حجز</span>
      </span>
    </button>
  )
}
