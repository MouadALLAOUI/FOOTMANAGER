import { useTranslation } from 'react-i18next'

export default function CalendarSlot({ slot, top, height, onClick }) {
  const { t } = useTranslation()
  if (slot.status === 'closed') {
    return (
      <button
        type="button"
        onClick={onClick}
        title={slot.metadata?.closureReason || t('terrain.calendar.closed')}
        className="absolute inset-x-1 flex cursor-help items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-200 bg-slate-100/70 text-slate-400 transition-colors hover:bg-slate-100"
        style={{ top, height }}
      >
        {height >= 26 && <span className="text-[9px] font-bold">{t('terrain.calendar.closed')}</span>}
      </button>
    )
  }

  const isPast = slot.metadata?.isPast
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPast}
      title={isPast ? t('terrain.calendar.pastSlot') : t('terrain.calendar.available')}
      className={`absolute inset-x-1 flex items-center justify-center gap-1 overflow-hidden rounded-lg border border-dashed transition-colors ${
        isPast
          ? 'border-slate-100 bg-slate-50/50 text-slate-300'
          : 'border-emerald-300/70 bg-emerald-50/40 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100/70'
      }`}
      style={{ top, height }}
    >
      <span className="px-1 text-[10px] font-bold">{slot.startTime}</span>
      {height >= 26 && !isPast && <span className="text-[9px] font-semibold opacity-70">{t('terrain.calendar.availableShort')}</span>}
    </button>
  )
}
