import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Ban,
  CalendarCheck,
  CalendarDays,
  Check,
  CircleDollarSign,
  CircleX,
  Clock,
  Landmark,
  Map,
  MapPin,
  Percent,
  Settings2,
  Star,
  Swords,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { SectionError } from '../../../components/errors'
import { mapHttpError } from '../../../lib/errorState'
import { toastApiError } from '../../../lib/errors'
import { Button, Card, Empty, Skeleton, Stat, StatusBadge } from '../../../components/dashboard/ui'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { AreaTrend } from '../../../components/dashboard/charts'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import GoToSite from '../../../components/ui/GoToSite'
import { invalidateKeys, useNotifications, useOwnerOverview, useOwnerOverviewAnalytics } from '../../../api/queries'
import { typeLabels } from '../components/TerrainCard'
import { bookingTypeLabels, reservationTypeLabels } from '../components/OwnerBookingCard'
import GuestBookingModal from '../components/GuestBookingModal'
import BookingDrawer from '../components/BookingDrawer'

const chartModes = [
  { key: 'weekly', label: 'terrain.overview.chart.weekly' },
  { key: 'monthly', label: 'terrain.overview.chart.monthly' },
  { key: 'yearly', label: 'terrain.overview.chart.yearly' },
]

function activityIcon(n) {
  const t = n.type || ''
  if (t.includes('approve') || t.includes('confirm')) return 'bg-emerald-50 text-emerald-600'
  if (t.includes('reject')) return 'bg-rose-50 text-rose-600'
  if (t.includes('cancel')) return 'bg-orange-50 text-orange-600'
  if (t.includes('booking') || t.includes('reservation')) return 'bg-sky-50 text-sky-600'
  return 'bg-slate-50 text-slate-500'
}

function todayISO() {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function Overview() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [mode, setMode] = useState('weekly')
  const [togglingId, setTogglingId] = useState(null)
  const [busyKey, setBusyKey] = useState(null)
  const [resolvedIds, setResolvedIds] = useState([])
  const [selected, setSelected] = useState(null)
  const [guestOpen, setGuestOpen] = useState(false)
  const [guestTerrain, setGuestTerrain] = useState(null)

  const { data: overviewData, isLoading: overviewLoading, error: overviewError, refetch: refetchOverview } = useOwnerOverview()
  const overviewErrorState = overviewError ? mapHttpError(overviewError) : null
  const { data: analyticsData, isLoading: analyticsLoading } = useOwnerOverviewAnalytics(mode)
  const { data: notifsData } = useNotifications({})

  const terrains = overviewData?.terrains || []
  const stats = overviewData?.stats || {}
  const todayBookings = overviewData?.today_bookings || []

  const pending = (overviewData?.pending_bookings || []).filter((b) => !resolvedIds.includes(b.id))

  const series = analyticsData?.series || []
  const occupancy = analyticsData?.occupancy ?? 0
  const counts = analyticsData?.counts || {}

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return t('terrain.overview.greeting.morning')
    if (h < 18) return t('terrain.overview.greeting.afternoon')
    return t('terrain.overview.greeting.evening')
  })()

  const formatDate = (str) => {
    if (!str) return '—'
    try {
      return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(str))
    } catch {
      return str
    }
  }

  const revenueRows = series.map((r) => r['الإيرادات'])
  const currentWindow = revenueRows.slice(-4).reduce((s, v) => s + v, 0)
  const prevWindow = revenueRows.slice(0, -4).reduce((s, v) => s + v, 0)
  const growth = prevWindow > 0 ? Math.round(((currentWindow - prevWindow) / prevWindow) * 100) : currentWindow > 0 ? 100 : 0

  const openTerrains = terrains.filter((t) => t.is_open !== false)
  const rated = terrains.filter((t) => Number(t.rating) > 0)
  const avgRating = rated.length ? (rated.reduce((s, t) => s + Number(t.rating), 0) / rated.length).toFixed(1) : '—'
  const popular = counts && terrains.length ? terrains.reduce((best, t) => (!best || (counts[t.id] || 0) > (counts[best.id] || 0) ? t : best), null) : null

  const decide = async (booking, action) => {
    const key = `${action}-${booking.id}`
    setBusyKey(key)
    try {
      const r = await api.put(`/owner/bookings/${booking.id}/${action}`)
      toast.success(action === 'approve' ? 'تم قبول الحجز' : 'تم رفض الحجز')
      const wa = r.data?.whatsapp_notification_url
      setResolvedIds((ids) => [...ids, booking.id])
      if (selected?.id === booking.id) setSelected(null)
      invalidateKeys(['owner'])
      if (wa) window.open(wa, '_blank')
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusyKey(null)
    }
  }

  const confirm = useConfirm()
  const confirmReject = (booking) => {
    if (!booking) return
    confirm.run(() => decide(booking, 'reject'), {
      title: t('terrain.overview.pending.confirmRejectTitle'),
      description: t('terrain.overview.pending.confirmRejectDesc', { title: booking.title || booking.team?.name || 'الحجز' }),
      confirmLabel: t('terrain.overview.pending.reject'),
    })
  }

  const toggleTerrain = async (terrain) => {
    setTogglingId(terrain.id)
    const isOpen = terrain.is_open !== false
    try {
      await api.put(`/owner/terrains/${terrain.id}/toggle-status`, {
        is_open: !isOpen,
        closure_reason: isOpen ? 'إغلاق سريع' : null,
      })
      toast.success(isOpen ? t('terrain.overview.toast.closed') : t('terrain.overview.toast.opened'))
      invalidateKeys(['owner'])
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setTogglingId(null)
    }
  }

  const openGuest = (terrain) => {
    if (!terrain) {
      toast.info(t('terrain.overview.quick.guestNeedsTerrain'))
      navigate('/terrain/terrains?new=1')
      return
    }
    setGuestTerrain(terrain)
    setGuestOpen(true)
  }

  const quickActions = [
    {
      key: 'guest',
      label: t('terrain.overview.quick.guest'),
      desc: t('terrain.overview.quick.guestDesc'),
      icon: UserPlus,
      color: 'text-green-600',
      bg: 'bg-green-50',
      onClick: () => openGuest(terrains[0]),
    },
    { key: 'terrains', label: t('terrain.overview.quick.manageTerrains'), desc: t('terrain.overview.quick.manageTerrainsDesc'), icon: Map, color: 'text-emerald-600', bg: 'bg-emerald-50', to: '/terrain/terrains' },
    { key: 'calendar', label: t('terrain.overview.quick.calendar'), desc: t('terrain.overview.quick.calendarDesc'), icon: CalendarDays, color: 'text-sky-600', bg: 'bg-sky-50', to: '/terrain/calendar' },
    { key: 'bookings', label: t('terrain.overview.quick.bookings'), desc: t('terrain.overview.quick.bookingsDesc'), icon: CalendarCheck, color: 'text-violet-600', bg: 'bg-violet-50', to: '/terrain/bookings' },
    { key: 'cancellations', label: t('terrain.overview.quick.cancellations'), desc: t('terrain.overview.quick.cancellationsDesc'), icon: CircleX, color: 'text-amber-600', bg: 'bg-amber-50', to: '/terrain/cancellations' },
    { key: 'closure', label: t('terrain.overview.quick.closure'), desc: t('terrain.overview.quick.closureDesc'), icon: Ban, color: 'text-orange-600', bg: 'bg-orange-50', to: '/terrain/closures?new=1' },
  ]

  const businessHealth = [
    { label: t('terrain.overview.health.occupancy'), value: occupancy === null ? '…' : `${occupancy}%`, icon: Percent, color: 'bg-sky-50 text-sky-600', bar: occupancy ?? 0, barColor: 'bg-sky-500' },
    {
      label: t('terrain.overview.health.revenueGrowth'),
      value: growth > 0 ? `+${growth}%` : `${growth}%`,
      icon: growth >= 0 ? TrendingUp : TrendingDown,
      color: growth >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600',
      sub: t('terrain.overview.health.revenueGrowthSub'),
    },
    { label: t('terrain.overview.health.avgRating'), value: avgRating, icon: Star, color: 'bg-amber-50 text-amber-600', sub: rated.length ? t('terrain.overview.health.avgRatingSub', { count: rated.length }) : t('terrain.overview.health.noRatings') },
    {
      label: t('terrain.overview.health.popularTerrain'),
      value: popular ? popular.name : '—',
      icon: Trophy,
      color: 'bg-violet-50 text-violet-600',
      sub: popular && counts ? t('terrain.overview.health.popularSub', { count: counts[popular.id] || 0 }) : t('terrain.overview.health.noData'),
      truncate: true,
    },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <GoToSite />
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-l from-[#0b1220] via-[#0f1a2e] to-[#12321f] p-7 text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)] lg:p-8">
        <div className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-green-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 start-1/4 size-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 text-2xl font-black text-white shadow-[0_10px_24px_rgba(34,197,94,0.4)]">
              {(user?.name || '؟').slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-green-400">{greeting} 👋</p>
              <h2 className="mt-0.5 truncate text-xl font-black sm:text-2xl">{user?.name || t('terrain.overview.ownerLabel')}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/50">
                <Landmark className="size-3.5" />
                {t('terrain.overview.managing', { count: stats.total_terrains || 0, open: openTerrains.length })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={() => openGuest(terrains[0])}>
              <UserPlus className="size-4" />
              {t('terrain.overview.quick.guest')}
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-emerald-50 hover:border-white/40 hover:bg-white/70"
              onClick={() => navigate('/terrain/calendar')}
            >
              <CalendarCheck className="size-4" />
              {t('terrain.overview.hero.viewCalendar')}
            </Button>
          </div>
        </div>
        <div className="relative mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: t('terrain.overview.hero.stat.terrains'), value: stats.total_terrains ?? terrains.length, icon: Landmark },
            { label: t('terrain.overview.hero.stat.open'), value: openTerrains.length, icon: MapPin },
            { label: t('terrain.overview.hero.stat.confirmedMatches'), value: stats.booked_matches ?? 0, icon: Swords },
            { label: t('terrain.overview.hero.stat.revenue'), value: Number(stats.total_revenue ?? 0).toLocaleString(locale), icon: CircleDollarSign },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/[0.06] px-4 py-3 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-lg font-black">{s.value}</p>
                <s.icon className="size-4 text-green-400" />
              </div>
              <p className="mt-0.5 text-[11px] font-bold text-white/50">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Landmark} label={t('terrain.overview.stats.total')} value={stats.total_terrains ?? terrains.length} />
        <Stat icon={MapPin} label={t('terrain.overview.stats.available')} value={stats.available_terrains ?? 0} accent="sky" />
        <Stat icon={Swords} label={t('terrain.overview.stats.confirmedMatches')} value={stats.booked_matches ?? 0} accent="violet" />
        <Stat icon={CircleDollarSign} label={t('terrain.overview.stats.revenue')} value={Number(stats.total_revenue ?? 0)} accent="amber" suffix={t('terrain.overview.stats.currency')} />
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">{t('terrain.overview.quick.title')}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {quickActions.map((s) => {
            const inner = (
              <>
                <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${s.bg} ${s.color}`}>
                  <s.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-slate-900">{s.label}</p>
                  <p className="truncate text-[11px] font-semibold text-slate-500">{s.desc}</p>
                </div>
              </>
            )
            if (s.onClick) {
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={s.onClick}
                  className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 text-start shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
                >
                  {inner}
                </button>
              )
            }
            return (
              <Link
                key={s.key}
                to={s.to}
                className="group flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
              >
                {inner}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Pending bookings + Terrain status */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card
          title={t('terrain.overview.pending.title')}
          subtitle={t('terrain.overview.pending.subtitle')}
          className="lg:col-span-2"
          action={
            pending.length ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">
                <AlertTriangle className="size-3.5" />
                {pending.length}
              </span>
            ) : (
              <Link to="/terrain/bookings" className="text-[11px] font-bold text-green-600 hover:text-green-700">{t('terrain.overview.pending.viewAll')}</Link>
            )
          }
        >
          {overviewErrorState ? (
            <SectionError state={overviewErrorState} onRetry={refetchOverview} />
          ) : overviewLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : pending.length === 0 ? (
            <Empty title={t('terrain.overview.pending.empty')} description={t('terrain.overview.pending.emptyDesc')} icon={CalendarCheck} />
          ) : (
            <div className="space-y-2.5">
              {pending.map((b) => (
                <div key={b.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setSelected(b)}>
                      <p className="truncate text-sm font-extrabold text-slate-900">
                        {b.guest_name || b.manager?.name || b.team?.name || t('terrain.overview.pending.unknownBooker')}
                        {b.is_guest && (
                          <span className="ms-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700">ضيف</span>
                        )}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-slate-500">
                        <span className="truncate">{typeof b.terrain?.name === 'string' ? b.terrain.name : t('ov.common.terrain')}</span>
                        <span className="text-slate-300">•</span>
                        <span className="whitespace-nowrap">{formatDate(b.booking_date || b.start_date)}</span>
                        {b.start_time && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Clock className="size-3" />
                              {b.start_time} — {b.end_time}
                            </span>
                          </>
                        )}
                      </p>
                    </button>
                    <div className="shrink-0 rounded-xl bg-white px-2.5 py-1 text-center shadow-sm ring-1 ring-slate-200">
                      <p className="text-xs font-black text-green-700">{Number(b.price || 0).toLocaleString(locale)}</p>
                      <p className="text-[8px] font-bold text-slate-400">د.م</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status="pending" />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {reservationTypeLabels[b.reservation_type] || bookingTypeLabels[b.booking_type] || b.booking_type}
                    </span>
                    <div className="ms-auto flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" disabled={busyKey !== null} onClick={() => setSelected(b)}>
                        {t('terrain.overview.pending.details')}
                      </Button>
                      <Button size="sm" variant="dangerSoft" disabled={busyKey !== null} onClick={() => confirmReject(b)}>
                        <X className="size-3" /> {t('terrain.overview.pending.reject')}
                      </Button>
                      <Button size="sm" disabled={busyKey !== null} onClick={() => decide(b, 'approve')}>
                        <Check className="size-3" /> {t('terrain.overview.pending.approve')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={t('terrain.overview.terrains.title')}
          subtitle={t('terrain.overview.terrains.subtitle')}
          action={<Link to="/terrain/terrains" className="text-[11px] font-bold text-green-600 hover:text-green-700">{t('terrain.overview.terrains.manage')}</Link>}
        >
          {overviewLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : terrains.length === 0 ? (
            <Empty
              title={t('terrain.overview.terrains.empty')}
              description={t('terrain.overview.terrains.emptyDesc')}
              action={<Button size="sm" variant="soft" onClick={() => navigate('/terrain/terrains?new=1')}>{t('terrain.overview.terrains.add')}</Button>}
            />
          ) : (
            <div className="space-y-2.5">
              {terrains.map((terrain) => {
                const open = terrain.is_open !== false
                const img = terrain.cover_image_url
                return (
                  <div key={terrain.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-xl">
                        {img ? (
                          <img loading="lazy" decoding="async" src={img} alt="" className="size-full object-cover" />
                        ) : (
                          <div className="grid size-full place-items-center bg-gradient-to-br from-green-50 to-emerald-100 text-lg">🏟️</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-extrabold text-slate-900">{typeof terrain.name === 'string' ? terrain.name : 'ملعب'}</p>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${open ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                            <span className={`size-1 rounded-full ${open ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {open ? t('terrain.overview.terrains.open') : t('terrain.overview.terrains.closed')}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                          {typeof terrain.city === 'string' ? terrain.city : '—'} • {typeLabels[terrain.type] || terrain.type}
                        </p>
                        {!open && terrain.closure_reason && (
                          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">{terrain.closure_reason}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      <Button
                        size="sm"
                        variant={open ? 'dangerSoft' : 'soft'}
                        disabled={togglingId === terrain.id}
                        onClick={() => toggleTerrain(terrain)}
                        className="!px-2"
                      >
                        {togglingId === terrain.id ? '…' : open ? t('terrain.overview.terrains.suspend') : t('terrain.overview.terrains.open')}
                      </Button>
                      <Button size="sm" variant="soft" className="!px-2" onClick={() => openGuest(terrain)}>
                        {t('terrain.overview.quick.guest')}
                      </Button>
                      <Link to="/terrain/terrains" className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900">
                        <Settings2 className="size-3.5" />
                        {t('terrain.overview.terrains.manage')}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Revenue chart + Business health */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card
          title={t('terrain.overview.revenue.title')}
          subtitle={t('terrain.overview.revenue.subtitle')}
          className="lg:col-span-2"
          action={
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {chartModes.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMode(m.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${mode === m.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {t(m.label)}
                </button>
              ))}
            </div>
          }
        >
          {analyticsLoading || !analyticsData ? (
            <Skeleton className="h-60" />
          ) : series.every((r) => r['الإيرادات'] === 0) ? (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-slate-700">{t('terrain.overview.revenue.empty')}</p>
              <p className="mt-1 text-xs text-slate-500">{t('terrain.overview.revenue.emptyDesc')}</p>
            </div>
          ) : (
            <AreaTrend
              data={series}
              xKey="label"
              series={[
                { dataKey: 'الإيرادات', name: t('terrain.overview.revenue.seriesRevenue'), color: '#22c55e' },
                { dataKey: 'الحجوزات', name: t('terrain.overview.revenue.seriesBookings'), color: '#0ea5e9', fillOpacity: 0.06 },
              ]}
              height={250}
            />
          )}
        </Card>

        <Card title={t('terrain.overview.health.title')} subtitle={t('terrain.overview.health.subtitle')}>
          {analyticsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <div className="space-y-3.5">
              {businessHealth.map((h) => (
                <div key={h.label} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${h.color}`}>
                        <h.icon className="size-4" />
                      </span>
                      <p className="truncate text-[11px] font-bold text-slate-500">{h.label}</p>
                    </div>
                    <p className="max-w-[55%] truncate text-sm font-black text-slate-900">{h.value}</p>
                  </div>
                  {h.bar !== undefined && (
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${h.barColor} transition-all duration-700`} style={{ width: `${Math.min(h.bar, 100)}%` }} />
                    </div>
                  )}
                  {h.sub && <p className="mt-1.5 text-[10px] font-semibold text-slate-500">{h.sub}</p>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Today's bookings + Recent activity */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Card
          title={t('terrain.overview.today.title')}
          subtitle={t('terrain.overview.today.subtitle')}
          className="lg:col-span-2"
          action={<Link to="/terrain/bookings" className="text-[11px] font-bold text-green-600 hover:text-green-700">{t('terrain.overview.matches.viewAll')}</Link>}
        >
          {overviewLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : todayBookings.length === 0 ? (
            <Empty title={t('terrain.overview.today.empty')} description={t('terrain.overview.today.emptyDesc')} icon={CalendarDays} />
          ) : (
            <div className="space-y-2.5">
              {todayBookings.map((b) => {
                const isGuest = b.is_guest === true || Boolean(b.guest_name)
                const displayName = b.guest_name || b.manager?.name || b.team?.name || t('terrain.overview.pending.unknownBooker')
                return (
                  <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all hover:border-green-200 hover:bg-white">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-xl text-xs font-black text-white ${isGuest ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-green-400 to-emerald-600'}`}>
                      {displayName.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-slate-900">{displayName}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-slate-500">
                        <span className="truncate">{typeof b.terrain?.name === 'string' ? b.terrain.name : t('ov.common.terrain')}</span>
                        {b.start_time && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Clock className="size-3" />
                              {b.start_time} — {b.end_time}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge status={b.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title={t('terrain.overview.activity.title')} subtitle={t('terrain.overview.activity.subtitle')}>
          {notifsData?.notifications?.length === 0 ? (
            <Empty title={t('terrain.overview.activity.empty')} description={t('terrain.overview.activity.emptyDesc')} />
          ) : (
            <div className="space-y-3">
              {(notifsData?.notifications || []).slice(0, 5).map((n) => (
                <div key={n.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${activityIcon(n)}`}>
                    <span className="size-2 rounded-full bg-current" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">{n.title}</p>
                    <p className="line-clamp-2 text-[11px] font-semibold text-slate-500">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-slate-400">
                    {n.created_at ? new Date(n.created_at).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <BookingDrawer
        booking={selected}
        onClose={() => setSelected(null)}
        onApprove={() => selected && decide(selected, 'approve')}
        onReject={() => confirmReject(selected)}
        busy={busyKey !== null}
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

      <GuestBookingModal
        open={guestOpen}
        onClose={() => setGuestOpen(false)}
        terrainId={guestTerrain?.id}
        terrainName={guestTerrain?.name}
        date={todayISO()}
        refresh={() => invalidateKeys(['owner'])}
      />
    </div>
  )
}
