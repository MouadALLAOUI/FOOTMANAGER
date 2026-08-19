import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Plus,
  Repeat,
  Swords,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useManagerBookings, useStadiums } from '../../../api/queries'
import { mapHttpError } from '../../../lib/errorState'
import { SectionError } from '../../../components/errors'
import {
  Button,
  Empty,
  Field,
  FieldRow,
  Modal,
  SectionTitle,
  SkeletonCards,
  StatusBadge,
  inputClass,
  selectClass,
} from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { BookingCard } from '../../../components/dashboard/cards'
import { useToast } from '../../../components/ui/Toast'

const typeLabels = { training: 'تدريب', private: 'حجز خاص', match: 'مباراة' }
const dayLabels = { 0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت' }
const statusTabs = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'بانتظار التأكيد' },
  { key: 'approved', label: 'مؤكدة' },
]
const typeTabs = [
  { key: 'all', label: 'الكل' },
  { key: 'training', label: 'تدريب' },
  { key: 'private', label: 'حجز خاص' },
  { key: 'weekly', label: 'أبونمان أسبوعي' },
]

function NewBookingModal({ open, onClose, onSaved }) {
  const { toast } = useToast()
  const { data: stadiumsData } = useStadiums({ per_page: 50 }, { enabled: open })
  const [form, setForm] = useState({
    terrain_id: '',
    booking_type: 'training',
    reservation_type: 'single',
    booking_date: '',
    day_of_week: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const stadiums = stadiumsData?.data || []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const isWeekly = form.reservation_type === 'weekly_subscription'

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const payload = {
        terrain_id: Number(form.terrain_id),
        booking_type: form.booking_type,
        reservation_type: form.reservation_type,
        start_time: form.start_time,
        end_time: form.end_time,
        notes: form.notes || undefined,
        ...(isWeekly
          ? { day_of_week: Number(form.day_of_week), start_date: form.start_date, end_date: form.end_date || undefined }
          : { booking_date: form.booking_date }),
      }
      const res = await api.post('/manager/bookings/training', payload)
      toast.success(res.data.message || 'تم إرسال طلب الحجز')
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : e.response?.data?.message || 'تعذر إنشاء الحجز')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="حجز جديد" subtitle="احجز ملعبًا لتدريب أو مباراة فريقك" size="lg">
      <div className="space-y-4">
        <Field label="الملعب" required>
          <select className={selectClass} value={form.terrain_id} onChange={set('terrain_id')}>
            <option value="">اختر ملعبًا…</option>
            {stadiums.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.city} {s.price_per_team ? `(${s.price_per_team} د.م)` : ''}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">نوع الحجز</span>
          <div className="flex gap-2">
            {[
              { value: 'training', label: 'تدريب' },
              { value: 'private', label: 'حجز خاص' },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, booking_type: t.value }))}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                  form.booking_type === t.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">نظام الحجز</span>
          <div className="flex gap-2">
            {[
              { value: 'single', label: 'حجز لمرة واحدة' },
              { value: 'weekly_subscription', label: 'أبونمان أسبوعي' },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, reservation_type: t.value }))}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                  form.reservation_type === t.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {isWeekly ? (
          <FieldRow cols={3}>
            <Field label="اليوم الأسبوعي" required>
              <select className={selectClass} value={form.day_of_week} onChange={set('day_of_week')}>
                <option value="">اختر اليوم…</option>
                {Object.entries(dayLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="تاريخ البداية" required>
              <input type="date" className={inputClass} value={form.start_date} onChange={set('start_date')} />
            </Field>
            <Field label="تاريخ النهاية">
              <input type="date" className={inputClass} value={form.end_date} onChange={set('end_date')} />
            </Field>
          </FieldRow>
        ) : (
          <Field label="تاريخ الحجز" required>
            <input type="date" className={inputClass} value={form.booking_date} onChange={set('booking_date')} />
          </Field>
        )}

        <FieldRow>
          <Field label="وقت البداية" required>
            <input type="time" className={inputClass} value={form.start_time} onChange={set('start_time')} />
          </Field>
          <Field label="وقت النهاية" required>
            <input type="time" className={inputClass} value={form.end_time} onChange={set('end_time')} />
          </Field>
        </FieldRow>

        <Field label="ملاحظات">
          <textarea rows={2} className={`${inputClass} h-auto py-3`} value={form.notes} onChange={set('notes')} />
        </Field>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? 'جارٍ الإرسال…' : 'إرسال طلب الحجز'}
        </Button>
      </div>
    </Modal>
  )
}

function CancelModal({ booking, onClose, onSaved }) {
  const { toast } = useToast()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await api.post(`/manager/bookings/${booking.id}/request-cancel`, { reason: reason || undefined })
      toast.success('تم إرسال طلب الإلغاء إلى صاحب الملعب')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر إرسال طلب الإلغاء')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="طلب إلغاء الحجز" subtitle={`إلغاء حجز ${booking.terrain?.name}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <Hourglass className="size-5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-slate-600">
            سيتم إرسال طلب الإلغاء إلى صاحب الملعب لمراجعته. يبقى الحجز ساريًا حتى موافقة صاحب الملعب.
          </p>
        </div>
        <Field label="سبب الإلغاء (اختياري)">
          <textarea
            rows={3}
            className={`${inputClass} h-auto py-3`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: تعارض في المواعيد…"
          />
        </Field>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            تراجع
          </Button>
          <Button variant="danger" className="flex-1" disabled={busy} onClick={submit}>
            {busy ? 'جارٍ الإرسال…' : 'إرسال الطلب'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function BookingDetail({ booking, onClose, onCancel, onConvert }) {
  const terrain = booking?.terrain || {}
  const isWeekly = booking?.reservation_type === 'weekly_subscription'
  return (
    <Drawer open={Boolean(booking)} onClose={onClose} title="تفاصيل الحجز" subtitle={`حجز ${terrain.name || 'ملعب'}`} size="460">
      {booking && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-gradient-to-l from-[#0b1220] to-[#12321f] p-6 text-center text-white">
            {terrain.image_url ? (
              <img loading="lazy" decoding="async" src={terrain.image_url} alt="" className="mx-auto size-16 rounded-3xl object-cover ring-4 ring-white/10" />
            ) : (
              <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-white/10">
                <CalendarCheck className="size-8 text-green-400" />
              </span>
            )}
            <p className="mt-3 text-lg font-black">{terrain.name}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-semibold text-white/60">
              <MapPin className="size-3.5" />
              {terrain.city || '—'} {terrain.type ? `• ${terrain.type}` : ''}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-600 ring-1 ring-violet-200">
              {isWeekly ? (
                <>
                  <Repeat className="size-3" />
                  أبونمان أسبوعي
                </>
              ) : (
                typeLabels[booking.booking_type] || booking.booking_type
              )}
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                icon: Clock,
                label: isWeekly ? 'اليوم الأسبوعي' : 'التاريخ',
                value: isWeekly
                  ? `${dayLabels[booking.day_of_week] || '—'} (كل أسبوع)`
                  : booking.booking_date
                    ? new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' })
                    : '—',
              },
              { icon: CalendarCheck, label: 'الوقت', value: `${booking.start_time} - ${booking.end_time}` },
              { icon: Repeat, label: 'النوع', value: typeLabels[booking.booking_type] || booking.booking_type },
              { icon: Swords, label: 'السعر', value: `${booking.price} د.م` },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
                  <r.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400">{r.label}</p>
                  <p className="text-sm font-bold text-slate-800">{r.value}</p>
                </div>
              </div>
            ))}
          </div>

          {booking.notes && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-[10px] font-bold text-slate-400">ملاحظات</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{booking.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {booking.status === 'approved' && (
              <>
                <Button variant="dangerSoft" className="flex-1" onClick={() => onCancel(booking)}>
                  <XCircle className="size-4" />
                  طلب إلغاء
                </Button>
                <Button className="flex-1" onClick={() => onConvert(booking)}>
                  <Swords className="size-4" />
                  تحويل لمباراة
                </Button>
              </>
            )}
            {booking.status === 'pending' && (
              <div className="w-full rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-600">
                بانتظار تأكيد صاحب الملعب
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

export default function Bookings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { data, isLoading: loading, error, refetch } = useManagerBookings()
  const errorState = error ? mapHttpError(error) : null
  const [status, setStatus] = useState('all')
  const [type, setType] = useState('all')
  const [newOpen, setNewOpen] = useState(false)
  const [cancelBooking, setCancelBooking] = useState(null)
  const [detail, setDetail] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const bookings = data?.bookings || []

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const counts = useMemo(() => {
    const c = { all: bookings.length, pending: 0, approved: 0, weekly: 0 }
    bookings.forEach((b) => {
      if (b.status === 'pending') c.pending += 1
      if (b.status === 'approved') c.approved += 1
      if (b.reservation_type === 'weekly_subscription') c.weekly += 1
    })
    return c
  }, [bookings])

  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        const matchStatus = status === 'all' || b.status === status
        const matchType =
          type === 'all' || (type === 'weekly' ? b.reservation_type === 'weekly_subscription' : b.booking_type === type)
        return matchStatus && matchType
      }),
    [bookings, status, type],
  )

  const convert = async (b) => {
    if (!window.confirm('تحويل هذا الحجز إلى طلب مباراة يبحث عن خصم؟')) return
    setBusyId(b.id)
    try {
      const res = await api.post(`/manager/match-requests/from-booking/${b.id}`)
      toast.success(res.data.message || 'تم إنشاء طلب المباراة')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر التحويل')
    } finally {
      setBusyId(null)
    }
  }

  const actionsFor = (b) => (
    <>
      {b.status === 'approved' && (
        <>
          <Button size="sm" variant="dangerSoft" onClick={() => setCancelBooking(b)}>
            <XCircle className="size-3.5" />
            طلب إلغاء
          </Button>
          <Button size="sm" disabled={busyId === b.id} onClick={() => convert(b)}>
            <Swords className="size-3.5" />
            تحويل لمباراة
          </Button>
        </>
      )}
      {b.status === 'pending' && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
          <Hourglass className="size-3.5" />
          بانتظار تأكيد صاحب الملعب
        </span>
      )}
    </>
  )

  return (
    <div>
      <SectionTitle
        title="حجوزاتي"
        subtitle="حجوزات الملاعب الخاصة بفريقك"
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" />
            حجز جديد
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'إجمالي الحجوزات', value: counts.all, icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'بانتظار التأكيد', value: counts.pending, icon: Hourglass, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'مؤكدة', value: counts.approved, icon: CheckCircle2, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'أبونمان أسبوعي', value: counts.weekly, icon: Repeat, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <span className={`grid size-11 place-items-center rounded-2xl ${s.bg} ${s.color}`}>
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-black text-slate-900">{s.value}</p>
                <p className="text-xs font-semibold text-slate-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {statusTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              status === t.key
                ? 'bg-slate-900 text-white shadow'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {t.label}
            <span
              className={`grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-black ${
                status === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {counts[t.key] || 0}
            </span>
          </button>
        ))}
        <span className="mx-1 w-px bg-slate-200" />
        {typeTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              type === t.key
                ? 'bg-green-500 text-white shadow'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorState ? (
        <div className="mt-6">
          <SectionError state={errorState} onRetry={refetch} />
        </div>
      ) : loading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SkeletonCards count={4} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <Empty
            icon={CalendarPlus}
            title="لا حجوزات في هذا التصنيف"
            description="احجز ملعبًا لتدريبات ومباريات فريقك"
            action={
              type === 'all' && (
                <Button size="sm" onClick={() => setNewOpen(true)}>
                  <Plus className="size-3.5" />
                  حجز جديد
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.map((b) => (
            <div key={b.id} onClick={() => setDetail(b)} className="cursor-pointer">
              <BookingCard booking={b} actions={actionsFor(b)} />
            </div>
          ))}
        </div>
      )}

      <NewBookingModal open={newOpen} onClose={() => setNewOpen(false)} onSaved={refetch} />
      {cancelBooking && (
        <CancelModal booking={cancelBooking} onClose={() => setCancelBooking(null)} onSaved={refetch} />
      )}
      <BookingDetail
        booking={detail}
        onClose={() => setDetail(null)}
        onCancel={(b) => {
          setCancelBooking(b)
          setDetail(null)
        }}
        onConvert={(b) => {
          setDetail(null)
          convert(b)
        }}
      />
    </div>
  )
}
