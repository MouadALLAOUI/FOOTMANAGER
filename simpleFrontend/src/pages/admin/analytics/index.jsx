import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, ClipboardList, Flag, Swords, Trophy, Users, Ticket, TrendingUp } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { mapHttpError } from '../../../lib/errorState'
import { SectionError } from '../../../components/errors'
import { Card, PageHeader, StatWidget, Skeleton, Badge } from '../../../components/admin/ui'
import { AreaTrend, Donut, Bars } from '../../../components/dashboard/charts'
import RangeFilter, { rangeForPreset } from '../../../components/analytics/RangeFilter'

const roleColors = {
  manager: '#22c55e',
  terrain_owner: '#0ea5e9',
  player: '#8b5cf6',
  committee: '#f59e0b',
  admin: '#f43f5e',
}

function detectPreset(range) {
  if (!range?.from || !range?.to) return '30d'
  for (const p of ['today', '7d', '30d', '3m', 'year']) {
    const r = rangeForPreset(p)
    if (r.from === range.from && r.to === range.to) return p
  }
  return 'custom'
}

function formatHourLabel(hour) {
  const h = String(hour).padStart(2, '0')
  return `${h}:00`
}

function buildHourlyLabel(key) {
  return formatHourLabel(Number(key))
}

export default function Analytics() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'
  const [range, setRange] = useState(rangeForPreset('30d'))

  const preset = useMemo(() => detectPreset(range), [range])
  const isHourly = preset === 'today'

  const { data, loading, errorState, refetch } = useApi(
    () => api.get('/admin/analytics/platform', {
      params: { from: range.from, to: range.to, group_by: isHourly ? 'hour' : 'day' },
    }).then((r) => r.data),
    [range.from, range.to, isHourly],
  )

  const summary = data?.summary || {}
  const trends = data?.trends || {}

  const fmtKey = (key) => {
    if (!key) return ''
    try {
      if (isHourly) {
        return buildHourlyLabel(key)
      }
      if (/^\d{4}-\d{2}$/.test(key)) {
        return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date(`${key}-01T00:00:00`))
      }
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${key}T00:00:00`))
    } catch {
      return key
    }
  }

  const buildTrend = (metrics) => {
    const map = {}
    for (const name of metrics) {
      for (const row of trends[name] || []) {
        map[row.key] = map[row.key] || { label: fmtKey(row.key) }
        map[row.key][name] = row.count
      }
    }
    return Object.values(map)
  }

  const usersTeamsTrend = buildTrend(['users', 'teams'])
  const activityTrend = buildTrend(['bookings', 'matches_finished'])

  const hasHourlyData = isHourly && (usersTeamsTrend.length > 0 || activityTrend.length > 0)
  const hasAnyActivity = isHourly
    ? (trends.users || []).some((r) => r.count > 0) ||
      (trends.teams || []).some((r) => r.count > 0) ||
      (trends.bookings || []).some((r) => r.count > 0) ||
      (trends.matches_finished || []).some((r) => r.count > 0)
    : usersTeamsTrend.length > 0 || activityTrend.length > 0

  const roleData = Object.entries(summary.users?.by_role || {})
    .map(([name, value]) => ({ name: t(`analytics.roles.${name}`), value, color: roleColors[name] || '#22c55e' }))
    .filter((d) => d.value > 0)
  const bookingStatusData = Object.entries(summary.bookings?.by_status || {})
    .map(([status, value]) => ({ name: t(`status.${status}`), value }))
    .filter((d) => d.value > 0)
  const tournamentStatusData = Object.entries(summary.tournaments?.by_status || {})
    .map(([status, value]) => ({ name: t(`status.${status}`), value }))
    .filter((d) => d.value > 0)

  const statConfig = [
    { key: 'users', label: t('admin.analytics.stat.users'), icon: Users, tone: 'green' },
    { key: 'teams', label: t('admin.analytics.stat.teams'), icon: Flag, tone: 'violet' },
    { key: 'terrains', label: t('admin.analytics.stat.terrains'), icon: Building2, tone: 'sky' },
    { key: 'tournaments', label: t('admin.analytics.stat.tournaments'), icon: Trophy, tone: 'amber' },
    { key: 'matches', label: t('admin.analytics.stat.matches'), icon: Swords, tone: 'slate' },
    { key: 'bookings', label: t('admin.analytics.stat.bookings'), icon: Ticket, tone: 'blue' },
    { key: 'match_requests', label: t('admin.analytics.stat.matchRequests'), icon: ClipboardList, tone: 'slate' },
    { key: 'finished', label: t('admin.analytics.stat.finished'), icon: TrendingUp, tone: 'green' },
  ]

  const summaryValue = (key) => {
    if (key === 'users') return summary.users?.total ?? 0
    if (key === 'teams') return summary.teams ?? 0
    if (key === 'terrains') return summary.terrains?.total ?? 0
    if (key === 'tournaments') return summary.tournaments?.total ?? 0
    if (key === 'matches') return summary.matches?.total ?? 0
    if (key === 'bookings') return summary.bookings?.total ?? 0
    if (key === 'match_requests') return summary.match_requests?.total ?? 0
    if (key === 'finished') return summary.matches?.finished ?? 0
    return 0
  }

  const hourlyChartTip = isHourly ? t('admin.analytics.hourlyHint') : null

  return (
    <div>
      <PageHeader
        title={t('admin.analytics.title')}
        subtitle={t('admin.analytics.subtitle')}
        actions={
          <Badge tone="green">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t('admin.overview.healthy')}
          </Badge>
        }
      />

      <RangeFilter value={range} onChange={setRange} className="mb-6" />

      {errorState && <SectionError state={errorState} onRetry={refetch} />}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statConfig.map((s) => (
            <StatWidget key={s.key} icon={s.icon} label={s.label} value={summaryValue(s.key)} tone={s.tone} />
          ))}
        </div>
      )}

      {!loading && !errorState && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card title={isHourly ? t('admin.analytics.trendsUsersHourly') : t('admin.analytics.trendsUsers')}>
            {usersTeamsTrend.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                {isHourly ? t('admin.analytics.noActivityToday') : t('admin.analytics.empty')}
              </p>
            ) : (
              <AreaTrend
                data={usersTeamsTrend}
                xKey="label"
                series={[
                  { dataKey: 'users', name: t('admin.analytics.series.users'), color: '#22c55e' },
                  { dataKey: 'teams', name: t('admin.analytics.series.teams'), color: '#0ea5e9', fillOpacity: 0.06 },
                ]}
                height={isHourly ? 260 : 220}
              />
            )}
          </Card>
          <Card title={isHourly ? t('admin.analytics.trendsActivityHourly') : t('admin.analytics.trendsActivity')}>
            {activityTrend.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">
                {isHourly ? t('admin.analytics.noActivityToday') : t('admin.analytics.empty')}
              </p>
            ) : (
              <AreaTrend
                data={activityTrend}
                xKey="label"
                series={[
                  { dataKey: 'bookings', name: t('admin.analytics.series.bookings'), color: '#8b5cf6' },
                  { dataKey: 'matches_finished', name: t('admin.analytics.series.matches'), color: '#f59e0b', fillOpacity: 0.06 },
                ]}
                height={isHourly ? 260 : 220}
              />
            )}
          </Card>

          <Card title={t('admin.analytics.usersRole')}>
            {roleData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('admin.analytics.empty')}</p>
            ) : (
              <Donut data={roleData} height={210} centerLabel={t('admin.analytics.stat.users')} centerValue={summary.users?.total ?? 0} />
            )}
          </Card>

          <Card title={t('admin.analytics.bookingsStatus')}>
            {bookingStatusData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('admin.analytics.empty')}</p>
            ) : (
              <Bars
                data={bookingStatusData}
                xKey="name"
                bars={[{ dataKey: 'value', name: t('admin.analytics.stat.bookings'), color: '#22c55e' }]}
              />
            )}
          </Card>
        </div>
      )}

      {!loading && !errorState && tournamentStatusData.length > 0 && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title={t('admin.analytics.tournamentsStatus')}>
            <Bars
              data={tournamentStatusData}
              xKey="name"
              bars={[{ dataKey: 'value', name: t('admin.analytics.stat.tournaments'), color: '#0ea5e9' }]}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
