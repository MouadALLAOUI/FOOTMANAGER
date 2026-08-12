import { AlertTriangle, Check, MessageCircle, X } from 'lucide-react'
import { Badge, Button } from '../../../components/dashboard/ui'

export default function PendingBookingsCard({ bookings = [], busy = false, onView, onApprove, onReject }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="size-4" />
          </span>
          طلبات الحجز المعلقة
        </h3>
        <Badge variant="warning">{bookings.length}</Badge>
      </div>

      {bookings.length === 0 ? (
        <p className="py-8 text-center text-xs font-semibold text-slate-400">لا توجد حجوزات معلقة</p>
      ) : (
        <div className="space-y-2.5">
          {bookings.map((b) => (
            <div key={b.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => onView?.(b)}>
                  <p className="truncate text-sm font-extrabold text-slate-800 hover:text-green-600">{b.title}</p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                    {[b.subtitle, b.startTime && `${b.startTime} - ${b.endTime}`].filter(Boolean).join(' • ')}
                  </p>
                </button>
                <div className="shrink-0 rounded-xl bg-white px-2.5 py-1 text-center shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-black text-green-700">{Number(b.price || 0).toLocaleString('ar-MA')}</p>
                  <p className="text-[8px] font-bold text-slate-400">د.م</p>
                </div>
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <Button size="sm" variant="soft" className="flex-1" disabled={busy} onClick={() => onApprove?.(b.metadata.bookingId)}>
                  <Check className="size-3" /> قبول
                </Button>
                <Button size="sm" variant="dangerSoft" className="flex-1" disabled={busy} onClick={() => onReject?.(b.metadata.bookingId)}>
                  <X className="size-3" /> رفض
                </Button>
                {b.metadata.whatsappUrl && (
                  <a
                    href={b.metadata.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-9 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
                    title="واتساب"
                  >
                    <MessageCircle className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
