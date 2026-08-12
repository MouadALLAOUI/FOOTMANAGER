import { CalendarDays, Clock, Phone, Users } from 'lucide-react'
import { Button, StatusBadge } from '../../../components/dashboard/ui'
import { typeLabels } from './TerrainCard'

export const bookingTypeLabels = {
  training: 'حصة تدريبية',
  private: 'حجز خاص',
  match: 'مباراة',
}

export const reservationTypeLabels = {
  single: 'حجز فردي',
  weekly_subscription: 'أبونمان أسبوعي',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return dateStr
  }
}

export function OwnerBookingCard({ booking, onDecide, onView, whatsappUrl, terrainName }) {
  const manager = booking.manager || booking.user || {}
  const team = booking.team || {}
  const start = booking.start_time
  const end = booking.end_time
  const date = booking.booking_date || booking.date

  return (
    <div
      onClick={onView}
      role={onView ? 'button' : undefined}
      tabIndex={onView ? 0 : undefined}
      onKeyDown={onView ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onView()
        }
      } : undefined}
      className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-extrabold text-slate-900">
              {bookingTypeLabels[booking.booking_type] || booking.booking_type || 'حجز'}
            </p>
            <StatusBadge status={booking.status} />
          </div>
          <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
            {terrainName || booking.terrain?.name || 'ملعب'} • {reservationTypeLabels[booking.reservation_type] || '—'}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-green-50 px-3 py-2 text-center">
          <p className="text-sm font-black text-green-700">{Number(booking.price || 0).toLocaleString('ar-MA')}</p>
          <p className="text-[9px] font-bold text-green-600/70">درهم</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 text-[11px] font-semibold text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-green-500" />
          {formatDate(date)}
        </span>
        {start && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-green-500" />
            {start} - {end}
          </span>
        )}
      </div>

      <div className="mx-5 mt-3 flex items-center gap-2.5 border-t border-slate-100 pt-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 text-xs font-black text-green-700">
          {(manager.name || '؟').slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold text-slate-800">{manager.name || 'مسير'}</p>
          <p className="flex items-center gap-1 truncate text-[10px] text-slate-400">
            <Users className="size-3" />
            {team.name || 'فريق غير معروف'}
          </p>
        </div>
        {manager.phone && (
          <a
            href={`${manager.is_whatsapp ? 'https://wa.me/' : 'tel:'}${manager.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-700"
          >
            <Phone className="size-3" />
            {manager.phone}
          </a>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3">
        {onView && (
          <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onView() }}>
            التفاصيل
          </Button>
        )}
        {onDecide && booking.status === 'pending' && (
          <>
            <Button variant="outline" size="sm" className="flex-1 !text-rose-500" onClick={(e) => { e.stopPropagation(); onDecide('rejected') }}>
              رفض
            </Button>
            <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); onDecide('approved') }}>
              تأكيد
            </Button>
          </>
        )}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <Phone className="size-3.5" />
            واتساب
          </a>
        )}
      </div>
    </div>
  )
}

export { typeLabels }
