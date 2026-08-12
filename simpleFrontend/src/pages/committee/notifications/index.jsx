import { useEffect, useState } from 'react'
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  Flag,
  Hourglass,
  Inbox,
  Pin,
  PinOff,
  Trash2,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { SectionTitle, Button, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'

const typeIcons = {
  new_booking_request: Hourglass,
  booking_confirmation: CheckCircle2,
  booking_rejected: XCircle,
  booking_cancellation: XCircle,
  cancellation_requested: Hourglass,
  match_accepted: CalendarCheck,
  score_confirmed: CheckCircle2,
  score_disputed: Flag,
  stadium_review: Flag,
  system: Bell,
}

const typeColors = {
  new_booking_request: 'text-amber-600 bg-amber-50',
  booking_confirmation: 'text-emerald-600 bg-emerald-50',
  booking_rejected: 'text-rose-600 bg-rose-50',
  booking_cancellation: 'text-orange-600 bg-orange-50',
  cancellation_requested: 'text-orange-600 bg-orange-50',
  match_accepted: 'text-green-600 bg-green-50',
  score_confirmed: 'text-emerald-600 bg-emerald-50',
  score_disputed: 'text-red-600 bg-red-50',
  stadium_review: 'text-sky-600 bg-sky-50',
}

const filters = [
  { key: '', label: 'الكل' },
  { key: 'unread', label: 'غير المقروءة' },
  { key: 'important', label: 'مهمة' },
  { key: 'pinned', label: 'مثبتة' },
]

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `منذ ${hours} ساعة`
  const days = Math.floor(hours / 24)
  if (days < 7) return `منذ ${days} يوم`
  return new Date(dateStr).toLocaleDateString('ar-MA', { day: 'numeric', month: 'long' })
}

export default function Notifications() {
  const { toast } = useToast()
  const [filter, setFilter] = useState('')
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  const load = (p = 1, replace = false) => {
    setLoading(true)
    api
      .get(`/notifications?filter=${filter}&page=${p}`)
      .then((r) => {
        setNotifs((prev) => (replace ? r.data.notifications : [...prev, ...r.data.notifications]))
        setHasMore(r.data.has_more)
        setPage(p)
      })
      .catch(() => toast.error('تعذر تحميل الإشعارات'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const run = async (fn, msg, id) => {
    setBusyId(id)
    try {
      await fn()
      toast.success(msg)
      load(page, true)
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذرت العملية')
    } finally {
      setBusyId(null)
    }
  }

  const markAllRead = () =>
    run(
      () => api.put('/notifications/read-all'),
      'تم تعليم جميع الإشعارات كمقروءة',
    )

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        title="الإشعارات"
        subtitle="كل ما يتعلق بحجوزات ملاعبك"
        action={
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCircle2 className="size-3.5" />
            تعليم الكل كمقروء
          </Button>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filter === f.key
                ? 'bg-slate-900 text-white shadow'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-50 text-slate-300">
              <Inbox className="size-7" strokeWidth={1.6} />
            </span>
            <p className="mt-4 text-sm font-bold text-slate-700">لا إشعارات</p>
            <p className="mt-1 text-xs text-slate-400">ستصلك الإشعارات هنا عند حدوث جديد</p>
          </div>
        ) : (
          notifs.map((n) => {
            const Icon = typeIcons[n.type] || Bell
            const color = typeColors[n.type] || 'text-slate-500 bg-slate-100'
            const isBusy = busyId === n.id
            return (
              <div
                key={n.id}
                className={`group rounded-3xl border bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all ${
                  n.is_read ? 'border-slate-200/70' : 'border-green-200 bg-green-50/30'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${color}`}>
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-slate-900">{n.title}</p>
                      {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-green-500" />}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{n.body}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">{timeAgo(n.created_at)}</span>
                      {n.is_important && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-600 ring-1 ring-amber-200">
                          مهم
                        </span>
                      )}
                      {n.is_pinned && (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-600 ring-1 ring-violet-200">
                          مثبت
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        run(
                          () => api.put(`/notifications/${n.id}/pin`),
                          n.is_pinned ? 'تم إلغاء التثبيت' : 'تم تثبيت الإشعار',
                          n.id,
                        )
                      }
                      className={`grid size-8 place-items-center rounded-xl border transition-colors ${
                        n.is_pinned
                          ? 'border-violet-200 bg-violet-50 text-violet-600'
                          : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                      }`}
                      title={n.is_pinned ? 'إلغاء التثبيت' : 'تثبيت'}
                    >
                      {n.is_pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        run(
                          () => api.put(`/notifications/${n.id}/important`),
                          n.is_important ? 'تمت إزالة العلامة' : 'تمت تعليمه كمهم',
                          n.id,
                        )
                      }
                      className={`grid size-8 place-items-center rounded-xl border transition-colors ${
                        n.is_important
                          ? 'border-amber-200 bg-amber-50 text-amber-600'
                          : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
                      }`}
                      title="مهم"
                    >
                      <Flag className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        run(() => api.delete(`/notifications/${n.id}`), 'تم حذف الإشعار', n.id)
                      }
                      className="grid size-8 place-items-center rounded-xl border border-slate-200 bg-white text-rose-500 transition-colors hover:bg-rose-50"
                      title="حذف"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="sm" onClick={() => load(page + 1)}>
            تحميل المزيد
          </Button>
        </div>
      )}
    </div>
  )
}
