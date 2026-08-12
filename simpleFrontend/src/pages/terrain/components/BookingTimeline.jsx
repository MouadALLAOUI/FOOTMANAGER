import { CalendarCheck, Circle, Clock3, MessageCircle, UserRound } from 'lucide-react'

export const bookingStatusLabels = {
  pending: 'قيد الانتظار',
  approved: 'مؤكد',
  rejected: 'مرفوض',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

export default function BookingTimeline({ booking }) {
  const status = booking?.status || 'pending'
  const created = booking?.created_at

  const steps = [
    {
      icon: UserRound,
      label: 'طلب الحجز',
      desc: created
        ? `قُدّم ${new Date(created).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
        : 'تم إرسال طلب الحجز',
      done: true,
    },
    {
      icon: Clock3,
      label: 'مراجعة المالك',
      desc: status === 'pending' ? 'بانتظار قرارك' : 'تمت مراجعة الطلب',
      done: status !== 'pending',
      active: status === 'pending',
    },
    {
      icon: status === 'approved' ? CalendarCheck : status === 'cancelled' || status === 'rejected' ? Circle : CalendarCheck,
      label: bookingStatusLabels[status] || status,
      desc:
        status === 'approved'
          ? 'تم تأكيد الحجز بنجاح'
          : status === 'rejected'
            ? 'تم رفض الطلب'
            : status === 'cancelled'
              ? 'تم إلغاء الحجز'
              : status === 'completed'
                ? 'اكتملت الحصة'
                : 'لم يُتخذ قرار بعد',
      done: status !== 'pending',
      active: status === 'pending',
    },
    ...(booking?.whatsapp_notification_url
      ? [
          {
            icon: MessageCircle,
            label: 'إشعار واتساب',
            desc: 'تم إرسال الإشعار للمسير',
            done: true,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (
            <span className={`absolute start-[17px] top-9 bottom-0 w-px ${s.done ? 'bg-green-200' : 'bg-slate-100'}`} />
          )}
          <span
            className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-xl ring-4 ring-white ${
              s.active
                ? 'bg-amber-100 text-amber-600'
                : s.done
                  ? 'bg-green-50 text-green-600'
                  : 'bg-slate-100 text-slate-300'
            }`}
          >
            <s.icon className="size-4" />
          </span>
          <div className="pt-1">
            <p className={`text-xs font-extrabold ${s.active || s.done ? 'text-slate-800' : 'text-slate-300'}`}>{s.label}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{s.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
