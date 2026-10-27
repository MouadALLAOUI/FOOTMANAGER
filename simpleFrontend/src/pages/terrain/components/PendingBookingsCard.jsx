import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, ChevronDown, MessageCircle, X } from 'lucide-react'
import { Badge, Button } from '../../../components/dashboard/ui'

export default function PendingBookingsCard({ bookings = [], busy = false, onView, onApprove, onReject }) {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  if (bookings.length === 0) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-xs text-slate-500 shadow-xs">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span>طلبات الحجز المعلقة</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">0</span>
        </div>
        <span className="text-[11px] text-slate-400">{t('emptyStates.noPendingBookings', 'لا توجد طلبات معلقة')}</span>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40 p-3.5 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-7 sm:size-8 place-items-center rounded-xl bg-amber-500 text-white shadow-xs">
            <AlertTriangle className="size-3.5 sm:size-4" />
          </span>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-amber-950">
              {t('terrain.overview.pending.title', 'طلبات الحجز المعلقة')}
            </h3>
            <p className="text-[10px] sm:text-[11px] font-semibold text-amber-700">
              لديك {bookings.length} {bookings.length === 1 ? 'طلب حجز معلق بحاجة لقرارك' : 'طلبات حجز معلقة بحاجة لقرارك'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="warning">{bookings.length}</Badge>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="grid size-7 place-items-center rounded-lg border border-amber-200 bg-white text-amber-700 transition-transform"
            title={collapsed ? 'توسيع' : 'طي'}
          >
            <ChevronDown className={`size-3.5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="flex flex-col justify-between rounded-xl border border-amber-100 bg-white p-3 shadow-xs hover:border-amber-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="min-w-0 flex-1 text-start" onClick={() => onView?.(b)}>
                  <p className="truncate text-xs sm:text-sm font-black text-slate-900 hover:text-emerald-600 transition-colors">
                    {b.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                    {[b.subtitle, b.startTime && `${b.startTime} - ${b.endTime}`].filter(Boolean).join(' • ')}
                  </p>
                </button>
                <div className="shrink-0 rounded-lg bg-emerald-50 px-2 py-0.5 text-center border border-emerald-200">
                  <p className="text-xs font-black text-emerald-700">{Number(b.price || 0).toLocaleString('ar-MA')}</p>
                  <p className="text-[8px] font-bold text-emerald-600">د.م</p>
                </div>
              </div>

              <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="soft"
                  className="flex-1 text-xs py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  disabled={busy}
                  onClick={() => onApprove?.(b.metadata.bookingId)}
                >
                  <Check className="size-3" /> قبول
                </Button>
                <Button
                  size="sm"
                  variant="dangerSoft"
                  className="flex-1 text-xs py-1.5 font-bold"
                  disabled={busy}
                  onClick={() => onReject?.(b.metadata.bookingId)}
                >
                  <X className="size-3" /> رفض
                </Button>
                {b.metadata.whatsappUrl && (
                  <a
                    href={b.metadata.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="grid size-8 shrink-0 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition-colors hover:bg-emerald-100"
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
