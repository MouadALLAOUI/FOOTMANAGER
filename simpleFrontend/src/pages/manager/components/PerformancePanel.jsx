import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TrendingUp } from 'lucide-react'
import { Skeleton } from '../../../components/dashboard/ui'
import { AreaTrend, Donut } from '../../../components/dashboard/charts'
import { useCommandCenter } from '../components/CommandCenterContext'
import { Section } from '../components/shared'

export default function PerformancePanel() {
  const { t } = useTranslation()
  const { team, rank, loading } = useCommandCenter()

  const series = useMemo(() => {
    if (!team) return []
    const played = team.matches_played || 0
    const points = team.points || 0
    const base = Math.max(0, Math.round(points * 0.4))
    return Array.from({ length: 8 }, (_, i) => {
      const day = 7 - i
      const season = Math.min(played, Math.max(2, Math.round((played * (7 - i)) / 8)))
      const near = base + Math.round(points * 0.6 * (season / Math.max(played, 1)))
      return { label: t('ov.performance.dayLabel', { day }), value: season <= played ? near : base }
    })
  }, [team, t])

  const donut = useMemo(
    () =>
      team
        ? [
            { name: t('ov.performance.wins'), value: team.wins || 0, color: '#10b981' },
            { name: t('ov.performance.draws'), value: team.draws || 0, color: '#f59e0b' },
            { name: t('ov.performance.losses'), value: team.losses || 0, color: '#f43f5e' },
          ].filter((x) => x.value > 0)
        : [],
    [team, t],
  )

  if (loading || !team) {
    return (
      <Section icon={TrendingUp} tint="green" title={t('ov.performance.title')} subtitle={t('ov.performance.loadingSubtitle')}>
        <div className="grid gap-3 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </Section>
    )
  }

  const goals = (team.goals_for || 0) - (team.goals_against || 0)

  return (
    <Section
      id="performance"
      icon={TrendingUp}
      tint="green"
      title={t('ov.performance.title')}
      subtitle={t('ov.performance.subtitle')}
      badge={
        rank ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600 ring-1 ring-emerald-200">
            {t('ov.performance.rank', { rank })}
          </span>
        ) : undefined
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AreaTrend
            data={series}
            xKey="label"
            series={[{ dataKey: 'value', name: t('ov.performance.pointsSeries'), color: '#10b981' }]}
            height={200}
          />
        </div>
        <div className="flex flex-col gap-4">
          <Donut
            title={t('ov.performance.results')}
            data={donut}
            height={150}
            innerRadius={48}
            outerRadius={66}
            centerLabel={t('ov.performance.match')}
            centerValue={team.matches_played || 0}
          />
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-slate-50/70 p-3">
              <p className="text-lg font-black text-slate-800">{team.points || 0}</p>
              <p className="text-[10px] font-bold text-slate-400">{t('ov.performance.pointsLabel')}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-3">
              <p className={`text-lg font-black ${goals >= 0 ? 'text-green-600' : 'text-rose-500'}`}>
                {goals >= 0 ? '+' : ''}
                {goals}
              </p>
              <p className="text-[10px] font-bold text-slate-400">{t('ov.performance.goalDiff')}</p>
            </div>
            <div className="rounded-2xl bg-slate-50/70 p-3">
              <p className="text-lg font-black text-slate-800">{team.matches_played || 0}</p>
              <p className="text-[10px] font-bold text-slate-400">{t('ov.performance.match')}</p>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
