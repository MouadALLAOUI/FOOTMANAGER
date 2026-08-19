import { useTranslation } from 'react-i18next'
import { Activity, Award, Crown, Footprints, Percent, Shield, Sparkles, Swords, Target, TrendingDown, TrendingUp, Trophy, Users } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Card, SectionTitle, Skeleton, Stat, Badge } from '../../../components/dashboard/ui'
import { Donut, Bars } from '../../../components/dashboard/charts'

const formColors = {
  win: 'bg-green-500 text-white',
  loss: 'bg-rose-500 text-white',
  draw: 'bg-slate-300 text-slate-700',
}

export default function TeamAnalytics() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'

  const { data: statsData, loading: statsLoading } = useApi(() => api.get('/v1/manager/team/statistics').then((r) => r.data.data), [])
  const { data: historyData, loading: historyLoading } = useApi(
    () => api.get('/v1/team/fixtures/history', { params: { per_page: 10 } }).then((r) => r.data.data || []),
    [],
  )
  const { data: profileData } = useApi(() => api.get('/manager/team-profile').then((r) => r.data?.team || null), [])

  const stats = statsData || {}
  const history = historyData || []

  const goalsTrend = [...history].reverse().map((m) => ({
    label: m.date ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(new Date(`${m.date}T00:00:00`)) : '—',
    goalsFor: m.goals_for ?? 0,
    goalsAgainst: m.goals_against ?? 0,
  }))

  const resultsDonut = [
    { name: t('manager.analytics.form.win'), value: stats.wins ?? 0, color: '#22c55e' },
    { name: t('manager.analytics.form.draw'), value: stats.draws ?? 0, color: '#f59e0b' },
    { name: t('manager.analytics.form.loss'), value: stats.losses ?? 0, color: '#f43f5e' },
  ].filter((d) => d.value > 0)

  const recentForm = [...history].slice(0, 5).map((m) => m.result || 'draw')

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
    { icon: Sparkles, label: t('manager.analytics.stat.streak'), value: stats.current_streak ?? 0, accent: 'orange' },
    { icon: Users, label: t('manager.analytics.stat.avgGoals'), value: stats.average_goals ?? 0, accent: 'sky' },
  ]

  const highlights = [
    { icon: Trophy, label: t('manager.analytics.highlights.topScorer'), value: stats.top_scorer?.name || t('manager.analytics.empty') },
    { icon: Users, label: t('manager.analytics.highlights.topAssist'), value: stats.top_assist_provider?.name || t('manager.analytics.empty') },
    { icon: Award, label: t('manager.analytics.highlights.mvp'), value: stats.most_valuable_player?.name || t('manager.analytics.empty') },
  ]

  return (
    <div>
      <SectionTitle title={t('manager.analytics.title')} subtitle={profileData?.name || t('manager.analytics.subtitle')} />

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

      {!statsLoading && (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card title={t('manager.analytics.results')}>
            {resultsDonut.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('manager.analytics.empty')}</p>
            ) : (
              <Donut data={resultsDonut} height={220} centerLabel={t('manager.analytics.stat.matches')} centerValue={stats.matches_played ?? 0} />
            )}
          </Card>

          <Card title={t('manager.analytics.goalsTrend')}>
            {historyLoading || goalsTrend.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('manager.analytics.empty')}</p>
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
    </div>
  )
}
