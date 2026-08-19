import { useTranslation } from 'react-i18next'
import { BarChart3, Flame, Swords, Target, Trophy } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Card, Empty, Skeleton, Stat } from '../../../components/dashboard/ui'
import { Bars } from '../../../components/dashboard/charts'

function matchWinner(f) {
  const m = f.match
  if (!m) return ''
  let winnerId = m.winner_team_id
  if (!winnerId && m.home_penalties != null && m.away_penalties != null && m.home_penalties !== m.away_penalties) {
    winnerId = m.home_penalties > m.away_penalties ? f.home_team?.id : f.away_team?.id
  }
  if (!winnerId && m.home_score != null && m.away_score != null && m.home_score !== m.away_score) {
    winnerId = m.home_score > m.away_score ? f.home_team?.id : f.away_team?.id
  }
  if (!winnerId) return ''
  if (winnerId === f.home_team?.id) return f.home_team?.name || ''
  if (winnerId === f.away_team?.id) return f.away_team?.name || ''
  return ''
}

export default function AnalyticsTab({ tournament, refreshKey }) {
  const { t } = useTranslation()

  const { data: stats, loading: statsLoading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/statistics`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )
  const { data: fixtures, loading: fixturesLoading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/fixtures`).then((r) => r.data.data || []),
    [tournament.id, refreshKey],
  )
  const { data: standings, loading: standingsLoading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/standings`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const loading = statsLoading || fixturesLoading || standingsLoading

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  const summary = stats?.summary || {}
  const fixtureList = fixtures || []
  const played = summary.matches_played ?? 0
  const remaining = Math.max(0, fixtureList.length - played)
  const cardsCount = (stats?.yellow_cards || []).reduce((s, r) => s + (r.count || 0), 0)
    + (stats?.red_cards || []).reduce((s, r) => s + (r.count || 0), 0)

  const rounds = new Map()
  for (const f of fixtureList) {
    if (f.match?.status !== 'finished') continue
    const name = f.round?.name || (f.group?.name ? `${t('committee.export.group')} ${f.group.name}` : t('committee.detail.round', { n: f.matchday }))
    if (!rounds.has(name)) rounds.set(name, { name, goals: 0, matches: 0 })
    const round = rounds.get(name)
    round.goals += (f.match.home_score ?? 0) + (f.match.away_score ?? 0)
    round.matches += 1
  }
  const goalsTrend = [...rounds.values()]

  const koRounds = new Map()
  for (const f of fixtureList) {
    if (f.round?.stage === 'group' || f.match?.status !== 'finished') continue
    const name = f.round?.name || t('committee.export.knockout')
    if (!koRounds.has(name)) koRounds.set(name, [])
    const winner = matchWinner(f)
    if (winner) koRounds.get(name).push(winner)
  }
  const knockoutProgression = [...koRounds.entries()]

  const statCards = [
    { icon: Swords, label: t('committee.analytics.stat.played'), value: played, accent: 'green' },
    { icon: Trophy, label: t('committee.analytics.stat.remaining'), value: remaining, accent: 'amber' },
    { icon: Target, label: t('committee.analytics.stat.goals'), value: summary.total_goals ?? 0, accent: 'violet' },
    { icon: BarChart3, label: t('committee.analytics.stat.avgGoals'), value: summary.average_goals_per_match ?? 0, accent: 'sky' },
    { icon: Flame, label: t('committee.analytics.stat.cards'), value: cardsCount, accent: 'rose' },
    { icon: Trophy, label: t('committee.analytics.stat.scheduled'), value: summary.scheduled ?? 0, accent: 'orange' },
  ]

  const hasAny = fixtureList.length > 0 || (standings?.groups || []).length > 0
  if (!hasAny) {
    return <Empty icon={BarChart3} title={t('committee.analytics.empty')} description={t('committee.analytics.emptyDesc')} />
  }

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((s) => (
          <Stat key={s.label} icon={s.icon} label={s.label} value={s.value} accent={s.accent} />
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title={t('committee.analytics.goalsTrend.title')} subtitle={t('committee.analytics.goalsTrend.subtitle')}>
          {goalsTrend.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">{t('committee.analytics.none')}</p>
          ) : (
            <Bars
              data={goalsTrend}
              xKey="name"
              bars={[{ dataKey: 'goals', name: t('committee.analytics.stat.goals'), color: '#22c55e' }]}
            />
          )}
        </Card>

        <Card title={t('committee.analytics.knockout.title')} subtitle={t('committee.analytics.knockout.subtitle')}>
          {knockoutProgression.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">{t('committee.analytics.knockout.none')}</p>
          ) : (
            <div className="space-y-4">
              {knockoutProgression.map(([name, winners]) => (
                <div key={name}>
                  <p className="mb-2 text-xs font-black text-green-600">{name}</p>
                  <div className="flex flex-wrap gap-2">
                    {winners.map((winner, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">
                        <Trophy className="size-3.5 text-amber-500" />
                        {winner}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {(standings?.groups || []).map((group) => (
          <Card key={group.group_id ?? group.name} title={t('committee.analytics.groupPerf.title', { group: group.name })} subtitle={t('committee.analytics.groupPerf.subtitle')}>
            {!(group.rows || []).length ? (
              <p className="py-10 text-center text-sm text-slate-400">{t('committee.analytics.none')}</p>
            ) : (
              <Bars
                data={(group.rows || []).map((row) => ({ name: row.team?.name || '—', points: row.points ?? 0 }))}
                xKey="name"
                bars={[{ dataKey: 'points', name: t('committee.analytics.stat.points'), color: '#0ea5e9' }]}
              />
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
