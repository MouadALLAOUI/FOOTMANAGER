import { CalendarDays, Clock, MessageCircle, StickyNote } from 'lucide-react'
import Drawer from '../../../components/dashboard/Drawer'
import { Button, Modal, StatusBadge } from '../../../components/dashboard/ui'
import { ManagerProfile } from '../../../components/ui'
import BookingTimeline, { bookingStatusLabels } from './BookingTimeline'

const bookingTypeLabels = {
  training: 'حصة تدريبية',
  private: 'حجز خاص',
  match: 'مباراة',
}

const reservationTypeLabels = {
  single: 'حجز فردي',
  weekly_subscription: 'أبونمان أسبوعي',
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(dateStr + 'T00:00:00'))
  } catch {
    return dateStr
  }
}

export default function BookingDrawer({ booking, onClose, onApprove, onReject, busy, variant = 'drawer' }) {
  if (!booking) return null
  const manager = booking.manager || {}
  const team = booking.team || {}

  const rows = [
    { label: 'الملعب', value: booking.terrain?.name || '—', icon: CalendarDays },
    { label: 'التاريخ', value: formatDate(booking.date || booking.booking_date), icon: CalendarDays },
    { label: 'الوقت', value: booking.start_time ? `${booking.start_time} — ${booking.end_time}` : '—', icon: Clock },
    { label: 'النوع', value: bookingTypeLabels[booking.booking_type] || booking.booking_type || '—', icon: Clock },
    { label: 'نوع الحجز', value: reservationTypeLabels[booking.reservation_type] || booking.reservation_type || '—', icon: Clock },
  ]

  const subtitle = `#${booking.id} • ${bookingStatusLabels[booking.status] || booking.status}`

  const content = (
    <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
          <div>
            <p className="text-xs font-bold text-slate-400">السعر الإجمالي</p>
            <p className="mt-0.5 text-2xl font-black text-green-600">
              {Number(booking.price || 0).toLocaleString('ar-MA')} <span className="text-xs font-bold">د.م</span>
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {rows.map((r) => (
            <div key={r.label} className="rounded-2xl border border-slate-100 bg-white p-3.5">
              <p className="text-[10px] font-bold text-slate-400">{r.label}</p>
              <p className="mt-0.5 truncate text-sm font-extrabold text-slate-800">{r.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <ManagerProfile manager={manager} team={team} />
        </div>

        {booking.notes && (
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
              <StickyNote className="size-3.5" /> ملاحظات المسير
            </p>
            <p className="mt-1.5 text-sm font-semibold text-slate-700">{booking.notes}</p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="mb-3 text-xs font-extrabold text-slate-700">سجل الحجز</p>
          <BookingTimeline booking={booking} />
        </div>

        {(booking.status === 'pending' || !booking.status) && (
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={onApprove}>
              قبول الحجز
            </Button>
            <Button variant="dangerSoft" className="flex-1" disabled={busy} onClick={onReject}>
              رفض
            </Button>
          </div>
        )}

        {booking.whatsapp_notification_url && (
          <a
            href={booking.whatsapp_notification_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] transition-colors hover:bg-emerald-600"
          >
            <MessageCircle className="size-4" />
            إشعار المسير عبر واتساب
          </a>
        )}
    </div>
  )

  if (variant === 'modal') {
    return (
      <Modal open onClose={onClose} title="تفاصيل الحجز" subtitle={subtitle} size="lg">
        {content}
      </Modal>
    )
  }

  return (
    <Drawer open onClose={onClose} title="تفاصيل الحجز" subtitle={subtitle} size="520">
      {content}
    </Drawer>
  )
}
