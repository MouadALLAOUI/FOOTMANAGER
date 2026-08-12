import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Ban,
  CalendarCheck,
  CalendarPlus,
  CircleDollarSign,
  Landmark,
  Map,
  MapPin,
  Percent,
  Star,
  Swords,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import api from '../../../api/client'
import { Card, Button, Skeleton, Stat, Empty } from '../../../components/dashboard/ui'
import { AreaTrend } from '../../../components/dashboard/charts'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import { useOwnerTerrains, useOwnerStats, useOwnerBookings, useNotifications, useOwnerOverviewAnalytics } from '../../../api/queries'
import { typeLabels } from '../components/TerrainCard'

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

export default function Overview() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: terrainsData, isLoading: terrainsLoading, refetch: refetchTerrains } = useOwnerTerrains()
  const { data: statsData } = useOwnerStats()
  const { data: bookingsData, isLoading: bookingsLoading } = useOwnerBookings()
  const { data: notifsData } = useNotifications({})

  const terrains = terrainsData?.terrains || []
  const stats = statsData?.stats || {}
  const matchBookings = bookingsData?.bookings || []
  const notifs = notifsData?.notifications || []

  const [mode, setMode] = useState('weekly')
  const [togglingId, setTogglingId] = useState(null)

  const { data: analyticsData, isLoading: analyticsLoading } = useOwnerOverviewAnalytics(mode)
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

  const formatTime = (str) => {
    if (!str) return ''
    try {
      return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(str))
    } catch {
      return ''
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

  const quickToggle = async (terrain) => {
    setTogglingId(terrain.id)
    const isOpen = terrain.is_open !== false
    try {
      await api.put(`/owner/terrains/${terrain.id}/toggle-status`, {
        is_open: !isOpen,
        closure_reason: isOpen ? 'إغلاق سريع' : null,
      })
      toast.success(isOpen ? t('terrain.overview.toast.closed') : t('terrain.overview.toast.opened'))
      refetchTerrains()
    } catch (e) {
      toast.error(e.response?.data?.message || t('terrain.overview.toast.error'))
    } finally {
      setTogglingId(null)
    }
  }

  const shortcuts = [
    { to: '/terrain/terrains?new=1', label: t('terrain.overview.shortcuts.newTerrain'), desc: t('terrain.overview.shortcuts.newTerrainDesc'), icon: Map, color: 'text-green-600', bg: 'bg-green-50' },
    { to: '/terrain/calendar', label: t('terrain.overview.shortcuts.calendar'), desc: t('terrain.overview.shortcuts.calendarDesc'), icon: CalendarCheck, color: 'text-sky-600', bg: 'bg-sky-50' },
    { to: '/terrain/bookings', label: t('terrain.overview.shortcuts.bookings'), desc: t('terrain.overview.shortcuts.bookingsDesc'), icon: CalendarPlus, color: 'text-violet-600', bg: 'bg-violet-50' },
    { to: '/terrain/closures?new=1', label: t('terrain.overview.shortcuts.closure'), desc: t('terrain.overview.shortcuts.closureDesc'), icon: Ban, color: 'text-amber-600', bg: 'bg-amber-50' },
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
            <Button variant="primary" onClick={() => navigate('/terrain/terrains?new=1')}>
              <Map className="size-4" />
              {t('terrain.overview.hero.newTerrain')}
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
                    <p className={`max-w-[55%] truncate text-sm font-black text-slate-900 ${h.truncate ? '' : ''}`}>{h.value}</p>
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

      {/* Terrain snapshot + reservations */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title={t('terrain.overview.terrains.title')} subtitle={t('terrain.overview.terrains.subtitle')} action={
          <Link to="/terrain/terrains" className="text-[11px] font-bold text-green-600 hover:text-green-700">{t('terrain.overview.terrains.manage')}</Link>
        }>
          {terrainsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
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
                const img = terrain.cover_image_url || terrain.images?.[0]?.image_url
                return (
                  <div key={terrain.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-2.5">
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl">
                      {img ? (
                        <img loading="lazy" decoding="async" src={img} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center bg-gradient-to-br from-green-50 to-emerald-100 text-lg">🏟️</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-extrabold text-slate-900">{terrain.name}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${open ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                          <span className={`size-1 rounded-full ${open ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {open ? t('terrain.overview.terrains.open') : t('terrain.overview.terrains.closed')}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {terrain.city || '—'} • {typeLabels[terrain.type] || terrain.type} • {Number(terrain.price_per_team || 0).toLocaleString(locale)} {t('terrain.overview.stats.currency')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={togglingId === terrain.id}
                      onClick={() => quickToggle(terrain)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${open ? 'bg-green-500' : 'bg-slate-300'}`}
                      title={open ? t('terrain.overview.terrains.close') : t('terrain.overview.terrains.open')}
                    >
                      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${open ? 'start-5' : 'start-0.5'}`} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card
          title={t('terrain.overview.matches.title')}
          subtitle={t('terrain.overview.matches.subtitle')}
          action={<Link to="/terrain/bookings" className="text-[11px] font-bold text-green-600 hover:text-green-700">{t('terrain.overview.matches.viewAll')}</Link>}
        >
          {bookingsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : matchBookings.length === 0 ? (
            <Empty title={t('terrain.overview.matches.empty')} description={t('terrain.overview.matches.emptyDesc')} />
          ) : (
            <div className="space-y-3">
              {matchBookings.slice(0, 5).map((b) => (
                <Link
                  key={b.id}
                  to="/terrain/bookings"
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 transition-all hover:border-green-200 hover:bg-white"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 text-green-600">
                    <Swords className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">
                      {b.host_team?.name || t('terrain.overview.matches.team', { id: b.host_team_id })}
                      {b.opponent_team?.name ? t('terrain.overview.matches.vs', { name: b.opponent_team.name }) : ''}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      {formatDate(b.match_datetime)}
                      {b.match_datetime && (
                        <> • {formatTime(b.match_datetime)}</>
                      )}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${b.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`}>
                    {b.status === 'accepted' ? t('terrain.overview.matches.confirmed') : t('terrain.overview.matches.open')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity + shortcuts */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title={t('terrain.overview.activity.title')} subtitle={t('terrain.overview.activity.subtitle')}>
          {notifs.length === 0 ? (
            <Empty title={t('terrain.overview.activity.empty')} description={t('terrain.overview.activity.emptyDesc')} />
          ) : (
            <div className="space-y-3">
              {notifs.slice(0, 5).map((n) => (
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

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900">{t('terrain.overview.shortcuts.title')}</h3>
            <Link to="/terrain/calendar" className="text-[11px] font-bold text-green-600 hover:text-green-700">{t('terrain.overview.shortcuts.calendar')}</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {shortcuts.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="group flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${s.bg} ${s.color}`}>
                  <s.icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-slate-900">{s.label}</p>
                  <p className="text-[11px] font-semibold text-slate-500">{s.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
