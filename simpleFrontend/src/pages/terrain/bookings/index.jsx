import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CircleDollarSign, Clock, History, Search, Swords } from 'lucide-react'
import { Button, Empty, SectionTitle, SkeletonCards, StatusBadge } from '../../../components/dashboard/ui'
import { queryClient } from '../../../api/queryClient'
import { useToast } from '../../../components/ui/Toast'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { OwnerBookingCard } from '../components/OwnerBookingCard'
import BookingDrawer from '../components/BookingDrawer'
import { fetchTerrainBookings } from '../components/bookingsData'
import { useOwnerTerrains, useOwnerBookings } from '../../../api/queries'
import { mapHttpError } from '../../../lib/errorState'
import { SectionError } from '../../../components/errors'

const segments = [
  { key: 'bookings', label: 'حجوزات المواعيد' },
  { key: 'matches', label: 'المباريات' },
]

const statusTabs = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'معلقة' },
  { key: 'approved', label: 'مؤكدة' },
]

function formatDate(str) {
  if (!str) return '—'
  try {
    return new Intl.DateTimeFormat('ar-MA', { day: 'numeric', month: 'long' }).format(new Date(str + 'T00:00:00'))
  } catch {
    return str
  }
}

export default function Bookings() {
  const { toast } = useToast()
  const { data: terrainsData, isLoading: terrainsLoading, refetch: refetchTerrains } = useOwnerTerrains()
  const { data: bookingsData, isLoading: bookingsLoading, error: bookingsError, refetch: refetchBookings } = useOwnerBookings()
  const bookingsErrorState = bookingsError ? mapHttpError(bookingsError) : null
  const terrains = terrainsData?.terrains || []
  const matchRequests = bookingsData?.bookings || []

  const [segment, setSegment] = useState('bookings')
  const [status, setStatus] = useState('all')
  const [terrainFilter, setTerrainFilter] = useState('')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [bookings, setBookings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)

  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const all = useMemo(() => {
    const map = new Map()
    const key = (b) => `${b.id}|${b.date || b.booking_date}`
    for (const b of bookingsData?.upcoming || []) map.set(key(b), b)
    for (const b of bookingsData?.pending || []) map.set(key(b), b)
    return [...map.values()]
  }, [bookingsData])

  const counts = useMemo(() => {
    const c = { all: all.length, pending: 0, approved: 0 }
    for (const b of all) {
      const s = b.status === 'approved' ? 'approved' : 'pending'
      c[s] = (c[s] || 0) + 1
    }
    return c
  }, [all])

  const revenue = useMemo(() => all.filter((b) => b.status === 'approved').reduce((s, b) => s + Number(b.price || 0), 0), [all])

  const filtered = all.filter((b) => {
    if (status === 'pending' && b.status !== 'pending') return false
    if (status === 'approved' && b.status !== 'approved') return false
    if (terrainFilter && b.terrain?.id !== Number(terrainFilter)) return false
    if (!showAll) {
      const date = b.date || b.booking_date
      if (date && date < todayStr) return false
    }
    if (query) {
      const q = query.trim()
      const hay = [b.guest_name, b.team?.name, b.manager?.name, b.terrain?.name, b.date, b.start_time].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q.toLowerCase())) return false
    }
    return true
  })

  const hasHiddenPast = useMemo(
    () =>
      !showAll &&
      all.some((b) => {
        const date = b.date || b.booking_date
        return date && date < todayStr
      }),
    [all, showAll, todayStr],
  )

  const act = async (fn, success) => {
    setBusy(true)
    try {
      const r = await fn()
      toast.success(success)
      const wa = r?.data?.whatsapp_notification_url || r?.whatsapp_notification_url
      setSelected(null)
      refetchBookings()
      refetchTerrains()
      if (wa) window.open(wa, '_blank')
      return true
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذرت العملية')
      return false
    } finally {
      setBusy(false)
    }
  }

  const approve = (b) => act(() => api.put(`/owner/bookings/${b.id}/approve`), 'تم قبول الحجز')
  const reject = (b) => act(() => api.put(`/owner/bookings/${b.id}/reject`), 'تم رفض الحجز')

  const confirm = useConfirm()
  const confirmReject = (b) => {
    if (!b) return
    confirm.run(() => reject(b), {
      title: 'رفض الحجز؟',
      description: `سيتم رفض حجز «${b.title || b.team?.name || 'الحجز'}».`,
      confirmLabel: 'رفض الحجز',
    })
  }

  const stats = [
    { label: 'في الانتظار', value: counts.pending || 0, icon: Clock, color: 'bg-amber-50 text-amber-600' },
    { label: 'مؤكدة قادمة', value: counts.approved || 0, icon: CalendarCheck, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'إيرادات قادمة (د.م)', value: revenue.toLocaleString('ar-MA'), icon: CircleDollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'مباريات على ملاعبك', value: matchRequests.length, icon: Swords, color: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div>
      <SectionTitle
        title="الحجوزات"
        subtitle="إدارة حجوزات المواعيد ومباريات ملاعبك"
        action={
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {segments.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSegment(s.key)}
                className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${segment === s.key ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${s.color}`}>
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-black leading-6 text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {segment === 'bookings' ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن فريق أو مسير أو ملعب…"
                aria-label="ابحث عن فريق أو مسير أو ملعب"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-11 pe-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              />
              <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            </div>
            <select
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none"
              value={terrainFilter}
              onChange={(e) => setTerrainFilter(e.target.value)}
            >
              <option value="">كل الملاعب</option>
              {terrains.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="flex rounded-xl border border-slate-200 bg-white p-1">
              {statusTabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatus(t.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${status === t.key ? 'bg-green-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {t.label}
                  <span className="ms-1 text-[10px] opacity-70">{counts[t.key] || 0}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
                showAll
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <History className="size-3.5" />
              {showAll ? 'إخفاء الماضية' : 'عرض كل الأوقات'}
            </button>
          </div>

          {bookingsErrorState ? (
            <SectionError state={bookingsErrorState} onRetry={refetchBookings} />
          ) : (terrainsLoading || bookingsLoading) || !bookingsData ? (
            <SkeletonCards count={4} />
          ) : filtered.length === 0 ? (
            <Empty
              title={hasHiddenPast ? 'لا حجوزات قادمة' : 'لا توجد حجوزات'}
              description={
                hasHiddenPast ? 'توجد حجوزات سابقة في الفترة الماضية، يمكنك عرضها' : 'ستظهر هنا حجوزات المواعيد على ملاعبك'
              }
              action={
                hasHiddenPast ? (
                  <Button size="sm" variant="outline" onClick={() => setShowAll(true)}>
                    <History className="size-3.5" />
                    عرض الحجوزات الماضية
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((b) => (
                <OwnerBookingCard
                  key={`${b.id}-${b.date}`}
                  booking={b}
                  terrainName={b.terrain?.name}
                  onView={() => setSelected(b)}
                  onDecide={(v) => (v === 'approved' ? approve(b) : confirmReject(b))}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {matchRequests.length === 0 ? null : (
              <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{matchRequests.length} مباراة</span>
            )}
          </div>
          {matchRequests.length === 0 ? (
            <Empty title="لا توجد مباريات" description="ستظهر هنا المباريات المفتوحة أو المؤكدة على ملاعبك" />
          ) : (
            <div className="space-y-2.5">
              {matchRequests.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600">
                      <Swords className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">
                        {m.host_team?.name || `الفريق #${m.host_team_id}`}
                        {m.opponent_team?.name ? <span className="text-slate-400"> ضد {m.opponent_team.name}</span> : ''}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {formatDate(m.match_datetime)}
                        {m.match_datetime && (
                          <> • {new Intl.DateTimeFormat('ar-MA', { hour: '2-digit', minute: '2-digit' }).format(new Date(m.match_datetime))}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={m.status === 'accepted' ? 'approved' : 'open'} />
                    <Button size="sm" variant="outline" onClick={() => toast.info('يمكنك إدارة هذا الموعد من التقويم')}>التقويم</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <BookingDrawer
        booking={selected}
        onClose={() => setSelected(null)}
        onApprove={() => approve(selected)}
        onReject={() => confirmReject(selected)}
        busy={busy}
        variant="modal"
      />

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={confirm.options.title}
        description={confirm.options.description}
        confirmLabel={confirm.options.confirmLabel}
        cancelLabel={confirm.options.cancelLabel}
        tone={confirm.options.tone}
        onConfirm={confirm.confirm}
        onClose={confirm.close}
      />
    </div>
  )
}
