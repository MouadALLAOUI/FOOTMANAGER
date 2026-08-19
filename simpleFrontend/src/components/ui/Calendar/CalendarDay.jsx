import { useTranslation } from 'react-i18next'

export default function CalendarDay({ day, onSelect }) {
  const { t } = useTranslation()
  const { dayName, dayNumber, isToday, isSelected, isClosed } = day

  return (
    <div
      className={`flex flex-col items-center border-b border-s border-slate-100 px-2 py-2.5 ${
        isToday ? 'bg-green-50/70' : isClosed ? 'bg-slate-50/40' : 'bg-slate-50/60'
      }`}
    >
      <p className={`text-[11px] font-bold ${isToday ? 'text-green-600' : isClosed ? 'text-slate-300' : 'text-slate-400'}`}>
        {dayName}
      </p>
      <button
        type="button"
        onClick={() => onSelect?.(day)}
        disabled={!onSelect}
        className={`mt-1 grid size-8 place-items-center rounded-full text-sm font-black transition-all ${
          isToday
            ? 'bg-green-500 text-white shadow-[0_4px_10px_rgba(22,163,74,0.35)]'
            : isSelected
              ? 'bg-green-100 text-green-700 ring-2 ring-green-400'
              : 'text-slate-700 hover:bg-slate-100'
        } ${isClosed ? 'opacity-50' : ''}`}
      >
        {dayNumber}
      </button>
      {isClosed ? (
        <span className="mt-1 text-[9px] font-bold text-rose-400">{t('terrain.calendar.closed')}</span>
      ) : (
        <span className="mt-1 h-3" />
      )}
    </div>
  )
}
