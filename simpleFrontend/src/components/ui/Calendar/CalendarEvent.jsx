import { Repeat } from 'lucide-react'

const eventStyles = {
  booked: 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_6px_14px_rgba(16,185,129,0.3)]',
  pending: 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-[0_6px_14px_rgba(245,158,11,0.3)]',
  rejected: 'bg-gradient-to-br from-rose-400 to-rose-500 shadow-[0_6px_14px_rgba(244,63,94,0.3)]',
  cancelled: 'bg-gradient-to-br from-slate-400 to-slate-500',
  completed: 'bg-gradient-to-br from-sky-500 to-blue-600',
}

const subscriptionStripe = {
  background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.22) 0 5px, transparent 5px 10px)',
}

export default function CalendarEvent({ event, top, height, onClick }) {
  const compact = height < 40
  const showPrice = height >= 56 && event.price != null
  const isSubscription = event.reservationType === 'weekly_subscription'
  const showTypeChip = isSubscription && height >= 48

  return (
    <button
      type="button"
      onClick={onClick}
      title={event.title}
      className={`absolute inset-x-1 z-10 flex flex-col justify-center overflow-hidden rounded-lg px-2 py-1 text-start text-white transition-transform hover:scale-[1.02] hover:brightness-105 ${
        eventStyles[event.status] || eventStyles.booked
      } ${isSubscription ? 'ring-2 ring-white/50' : ''}`}
      style={{ top, height }}
    >
      {isSubscription && <span aria-hidden className="pointer-events-none absolute inset-0 opacity-50" style={subscriptionStripe} />}

      <span className="relative flex min-w-0 items-center gap-1 truncate">
        {isSubscription && <Repeat className="size-3 shrink-0" aria-hidden />}
        <span className="truncate text-[11px] font-extrabold leading-tight">{event.title}</span>
      </span>

      {!compact && (
        <span className="relative mt-0.5 truncate text-[10px] font-semibold opacity-90">
          {event.startTime} — {event.endTime}
        </span>
      )}

      {showPrice && (
        <span className="relative mt-0.5 truncate text-[10px] font-semibold opacity-90">
          {Number(event.price).toLocaleString('ar-MA')} د.م
        </span>
      )}

      {showTypeChip && (
        <span className="relative mt-0.5 w-fit rounded-md bg-white/25 px-1.5 py-px text-[8px] font-black leading-tight">
          أبونمان
        </span>
      )}
    </button>
  )
}
