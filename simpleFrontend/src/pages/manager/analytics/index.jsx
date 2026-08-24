import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Award, CalendarCheck, CalendarX, Crown, Footprints, Percent, Shield, Sparkles, Swords, Target, TrendingDown, TrendingUp, Trophy, Users, Clock } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { mapHttpError } from '../../../lib/errorState'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, Skeleton, Stat, Badge } from '../../../components/dashboard/ui'
import { Donut, Bars, AreaTrend } from '../../../components/dashboard/charts'
import RangeFilter, { rangeForPreset } from '../../../components/analytics/RangeFilter'

const formColors = {
  win: 'bg-green-500 text-white',
  loss: 'bg-rose-500 text-white',
  draw: 'bg-slate-300 text-slate-700',
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
  return `${String(hour).padStart(2, '0')}:00`
}

export default function TeamAnalytics() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'
  const [range, setRange] = useState(rangeForPreset('30d'))

  const preset = useMemo(() => detectPreset(range), [range])
  const isHourly = preset === 'today'

  const { data: statsData, loading: statsLoading, errorState: statsErrorState, refetch: refetchStats } = useApi(
    () => api.get('/v1/manager/team/statistics', { params: { from: range.from, to: range.to, group_by: isHourly ? 'hour' : 'day' } }).then((r) => r.data.data),
    [range.from, range.to, isHourly],
  )
  const { data: historyData, loading: historyLoading } = useApi(
    () => api.get('/v1/team/fixtures/history', { params: { per_page: 10 } }).then((r) => r.data.data || []),
    [],
  )
  const { data: profileData } = useApi(() => api.get('/manager/team-profile').then((r) => r.data?.team || null), [])

  const stats = statsData || {}
  const history = historyData || []

  // Prefer backend series when range filtered, fallback to history
  const series = stats.series || null

  const fmtKey = (key) => {
    if (!key) return ''
    try {
      if (isHourly && /^\d+$/.test(String(key))) return formatHourLabel(Number(key))
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${key}T00:00:00`))
    } catch { return key }
  }

  const goalsTrend = useMemo(() => {
    if (series && Array.isArray(series) && series.length) {
      return series.map((r) => ({ label: fmtKey(r.key), goalsFor: r.goals_for ?? 0, goalsAgainst: r.goals_against ?? 0 }))
    }
    return [...history].reverse().map((m) => ({
      label: m.date ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${m.date}T00:00:00`)) : '—',
      goalsFor: m.goals_for ?? 0,
      goalsAgainst: m.goals_against ?? 0,
    }))
  }, [series, history, locale, isHourly])

  const resultsDonut = [
    { name: t('manager.analytics.form.win'), value: stats.wins ?? 0, color: '#22c55e' },
    { name: t('manager.analytics.form.draw'), value: stats.draws ?? 0, color: '#f59e0b' },
    { name: t('manager.analytics.form.loss'), value: stats.losses ?? 0, color: '#f43f5e' },
  ].filter((d) => d.value > 0)

  const matchBreakdownData = stats.match_breakdown
    ? [
        { name: t('manager.analytics.breakdown.completed'), value: stats.match_breakdown.completed ?? 0, color: '#22c55e' },
        { name: t('manager.analytics.breakdown.upcoming'), value: stats.match_breakdown.upcoming ?? 0, color: '#0ea5e9' },
        { name: t('manager.analytics.breakdown.cancelled'), value: stats.match_breakdown.cancelled ?? 0, color: '#94a3b8' },
      ].filter((d) => d.value > 0)
    : []

  const bookingData = stats.booking_summary
    ? [
        { name: t('manager.analytics.booking.completed'), value: stats.booking_summary.completed ?? 0, color: '#22c55e' },
        { name: t('manager.analytics.booking.upcoming'), value: stats.booking_summary.upcoming ?? 0, color: '#0ea5e9' },
        { name: t('manager.analytics.booking.cancelled'), value: stats.booking_summary.cancelled ?? 0, color: '#f43f5e' },
      ].filter((d) => d.value > 0)
    : []

  const recentForm = [...history].slice(0, 5).map((m) => m.result || 'draw')

  const streakValue = (() => {
    const s = stats.current_streak
    if (!s) return 0
    if (typeof s === 'object' && s.count != null) return s.count
    if (typeof s === 'number') return s
    return 0
  })()

  const statCards = [
    { icon: Swords, label: t('manager.analytics.stat.matches'), value: stats.matches_played ?? 0, accent: 'sky' },
    { icon: Trophy, label: t('manager.analytics.stat.wins'), value: stats.wins ?? 0, accent: 'green' },
    { icon: Activity, label: t('manager.analytics.stat.draws'), value: stats.draws ?? 0, accent: 'amber' },
    { icon: Target, label: t('manager.analytics.stat.losses'), value: stats.losses ?? 0, accent: 'rose' },
    { icon: TrendingUp, label: t('manager.analytics.stat.goalsFor'), value: stats.goals_for ?? 0, accent: 'green' },
    { icon: TrendingDown, label: t('manager.analytics.stat.goalsAgainst'), value: stats.goals_against ?? 0, accent: 'rose' },
    { icon: Footprints, label: t('manager.analytics.stat.goalDiff'), value: stats.goal_difference ?? 0, accent: 'violet' },
    { icon: Crown, label: t('manager.analytics.stat.points'), value: stats.points ?? 0, accent: 'amber' },
    { icon: Percent, label: t('manager.analytics.stat.winRate'), value: `${stats.win_rate ?? 0}%`, accent: 'green' },
    { icon: Shield, label: t('manager.analytics.stat.cleanSheets'), value: stats.clean_sheets ?? 0, accent: 'sky' },
    { icon: Sparkles, label: t('manager.analytics.stat.streak'), value: streakValue, accent: 'orange' },
    { icon: Users, label: t('manager.analytics.stat.avgGoals'), value: stats.average_goals ?? 0, accent: 'sky' },
  ]

  const highlights = [
    { icon: Trophy, label: t('manager.analytics.highlights.topScorer'), value: stats.top_scorer?.name || t('manager.analytics.empty') },
    { icon: Users, label: t('manager.analytics.highlights.topAssist'), value: stats.top_assist_provider?.name || t('manager.analytics.empty') },
    { icon: Award, label: t('manager.analytics.highlights.mvp'), value: stats.most_valuable_player?.name || t('manager.analytics.empty') },
  ]

  const hasNoMatches = !statsLoading && (stats.matches_played ?? 0) === 0

  return (
    <div>
      <SectionTitle
        title={t('manager.analytics.title')}
        subtitle={profileData?.name || t('manager.analytics.subtitle')}
        action={<RangeFilter value={range} onChange={setRange} />}
      />

      {statsErrorState && <SectionError state={statsErrorState} onRetry={refetchStats} />}

      {statsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-[26px]" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((s) => (
            <Stat key={s.label} icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
          ))}
        </div>
      )}

      {!statsLoading && !statsErrorState && hasNoMatches && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {t('manager.analytics.noMatches')}
        </div>
      )}

      {!statsLoading && !statsErrorState && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card title={t('manager.analytics.results')}>
            {resultsDonut.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('manager.analytics.empty')}</p>
            ) : (
              <Donut data={resultsDonut} height={220} centerLabel={t('manager.analytics.stat.matches')} centerValue={stats.matches_played ?? 0} />
            )}
          </Card>

          <Card title={isHourly ? t('manager.analytics.goalsTrendHourly') : t('manager.analytics.goalsTrend.title')}>
            {historyLoading ? (
              <div className="flex items-center justify-center py-10">
                <span className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-green-500" />
              </div>
            ) : goalsTrend.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{isHourly ? t('manager.analytics.noActivityToday') : t('manager.analytics.empty')}</p>
            ) : isHourly ? (
              <AreaTrend
                data={goalsTrend}
                xKey="label"
                series={[
                  { dataKey: 'goalsFor', name: t('manager.analytics.goalsTrend.for'), color: '#22c55e' },
                  { dataKey: 'goalsAgainst', name: t('manager.analytics.goalsTrend.against'), color: '#f43f5e', fillOpacity: 0.06 },
                ]}
                height={260}
              />
            ) : (
              <Bars
                data={goalsTrend}
                xKey="label"
                bars={[
                  { dataKey: 'goalsFor', name: t('manager.analytics.goalsTrend.for'), color: '#22c55e' },
                  { dataKey: 'goalsAgainst', name: t('manager.analytics.goalsTrend.against'), color: '#f43f5e' },
                ]}
              />
            )}
          </Card>

          <Card title={t('manager.analytics.breakdown.title')}>
            {matchBreakdownData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('manager.analytics.empty')}</p>
            ) : (
              <Donut data={matchBreakdownData} height={220} centerLabel={t('manager.analytics.breakdown.total')} centerValue={stats.match_breakdown?.total ?? 0} />
            )}
          </Card>

          <Card title={t('manager.analytics.booking.title')}>
            {bookingData.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('manager.analytics.empty')}</p>
            ) : (
              <Bars
                data={bookingData}
                xKey="name"
                bars={[{ dataKey: 'value', name: t('manager.analytics.booking.count'), color: '#22c55e' }]}
              />
            )}
          </Card>

          <Card title={t('manager.analytics.form.title')}>
            {recentForm.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('manager.analytics.empty')}</p>
            ) : (
              <div className="flex items-center gap-2">
                {recentForm.map((r, i) => (
                  <span
                    key={i}
                    className={`flex size-10 items-center justify-center rounded-xl text-sm font-black ${formColors[r] || 'bg-slate-100 text-slate-600'}`}
                  >
                    {t(`manager.analytics.form.letter.${r}`)}
                  </span>
                ))}
                <span className="ms-2 text-xs font-bold text-slate-400">{t('manager.analytics.form.last5')}</span>
              </div>
            )}
          </Card>

          <Card title={t('manager.analytics.highlights.title')}>
            <div className="space-y-3">
              {highlights.map((h) => (
                <div key={h.label} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-white text-green-600 shadow-sm">
                    <h.icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-400">{h.label}</p>
                    <p className="truncate text-sm font-bold text-slate-800">{h.value}</p>
                  </div>
                  {stats.top_scorer?.value && h.label === t('manager.analytics.highlights.topScorer') && (
                    <Badge variant="soft" className="ms-auto">
                      {stats.top_scorer.value} {t('manager.analytics.highlights.goals')}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Player + booking fallback when both breakdowns empty but stats loaded */}
      {!statsLoading && !statsErrorState && stats.match_breakdown && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><CalendarCheck className="size-3.5" />{t('manager.analytics.breakdown.completed')}: {stats.match_breakdown.completed ?? 0}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><Clock className="size-3.5" />{t('manager.analytics.breakdown.upcoming')}: {stats.match_breakdown.upcoming ?? 0}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5"><CalendarX className="size-3.5" />{t('manager.analytics.breakdown.cancelled')}: {stats.match_breakdown.cancelled ?? 0}</span>
        </div>
      )}
    </div>
  )
}
