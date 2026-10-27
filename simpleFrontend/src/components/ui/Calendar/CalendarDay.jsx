import { useTranslation } from 'react-i18next'

export default function CalendarDay({ day, onSelect }) {
  const { t } = useTranslation()
  const { dayName, dayNumber, isToday, isSelected, isClosed } = day

  return (
    <div
      className={`flex flex-col items-center border-b border-s border-slate-100 px-2 py-2 transition-colors ${
        isToday ? 'bg-emerald-50/50' : isClosed ? 'bg-slate-50/50' : 'bg-slate-50/30'
      }`}
    >
      <p className={`text-[11px] font-black ${isToday ? 'text-emerald-700' : isClosed ? 'text-slate-300' : 'text-slate-500'}`}>
        {dayName}
      </p>
      <button
        type="button"
        onClick={() => onSelect?.(day)}
        disabled={!onSelect}
        className={`mt-1 grid size-7 place-items-center rounded-xl text-xs font-black transition-all ${
          isToday
            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-600/20'
            : isSelected
              ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-400'
              : 'text-slate-700 hover:bg-slate-200/60'
        } ${isClosed ? 'opacity-40' : ''}`}
      >
        {dayNumber}
      </button>
      {isClosed ? (
        <span className="mt-1 text-[8.5px] font-bold text-rose-400 leading-none">{t('terrain.calendar.closed', 'مغلق')}</span>
      ) : (
        <span className="mt-1 h-2" />
      )}
    </div>
  )
}
