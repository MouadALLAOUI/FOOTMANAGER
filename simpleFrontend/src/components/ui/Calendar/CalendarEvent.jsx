import { useTranslation } from 'react-i18next'
import { Repeat } from 'lucide-react'

const eventStyles = {
  booked: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-xs border border-emerald-400/80 hover:from-emerald-600 hover:to-emerald-700',
  pending: 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-xs border border-amber-300/80 hover:from-amber-500 hover:to-amber-600',
  rejected: 'bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-xs border border-rose-400',
  cancelled: 'bg-slate-400 text-white shadow-xs',
  completed: 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-xs',
}

const subscriptionStripe = {
  background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0 4px, transparent 4px 8px)',
}

export default function CalendarEvent({ event, top, height, onClick }) {
  const { t } = useTranslation()
  const compact = height < 36
  const showPrice = height >= 54 && event.price != null
  const isSubscription = event.reservationType === 'weekly_subscription'
  const showTypeChip = isSubscription && height >= 46

  return (
    <button
      type="button"
      onClick={onClick}
      title={`${event.title} (${event.startTime} - ${event.endTime})`}
      className={`absolute inset-x-1 z-10 flex flex-col justify-center overflow-hidden rounded-lg px-2 py-1 text-start transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${
        eventStyles[event.status] || eventStyles.booked
      } ${isSubscription ? 'ring-1 ring-white/60' : ''}`}
      style={{ top, height }}
    >
      {isSubscription && (
        <span aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={subscriptionStripe} />
      )}

      <span className="relative flex min-w-0 items-center gap-1 truncate">
        {isSubscription && <Repeat className="size-2.5 shrink-0" aria-hidden />}
        <span className="truncate text-[11px] font-black leading-tight">{event.title}</span>
      </span>

      {!compact && (
        <span className="relative mt-0.5 truncate text-[9px] font-bold opacity-90">
          {event.startTime} — {event.endTime}
        </span>
      )}

      {showPrice && (
        <span className="relative mt-0.5 truncate text-[9px] font-bold opacity-95">
          {Number(event.price).toLocaleString('ar-MA')} {t('ov.common.currency', 'د.م')}
        </span>
      )}

      {showTypeChip && (
        <span className="relative mt-0.5 w-fit rounded bg-black/20 px-1 py-px text-[7.5px] font-black leading-tight text-white/95">
          {t('terrain.calendar.subscription', 'دوري')}
        </span>
      )}
    </button>
  )
}
