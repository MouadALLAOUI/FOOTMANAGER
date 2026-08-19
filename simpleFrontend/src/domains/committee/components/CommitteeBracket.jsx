import { useTranslation } from 'react-i18next'
import { ArrowUpRight, CheckCircle2, Crown, Loader2, Lock, Play } from 'lucide-react'
import { Card } from '../../../components/dashboard/ui'
import { TeamAvatar } from '../../../pages/tournaments/shared'

const STATE_META = {
  locked: { cls: 'bg-slate-100 text-slate-500', icon: Lock, key: 'committee.detail.roundState.locked' },
  available: { cls: 'bg-green-100 text-green-700', icon: Play, key: 'committee.detail.roundState.available' },
  in_progress: { cls: 'bg-amber-100 text-amber-700', icon: Loader2, key: 'committee.detail.roundState.inProgress' },
  completed: { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, key: 'committee.detail.roundState.completed' },
}

export default function CommitteeBracket({ rounds }) {
  const { t } = useTranslation()

  if (!rounds || rounds.length === 0) return null

  const sourceMap = new Map()
  rounds.forEach((round) => {
    ;(round.fixtures || []).forEach((f, i) => sourceMap.set(f.id, { name: round.name, number: i + 1 }))
  })

  const renderSource = (id) => {
    const src = sourceMap.get(id)
    if (!src) return null
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
        <ArrowUpRight className="size-3" />
        {t('committee.detail.bracketSource', { round: src.name, n: src.number })}
      </span>
    )
  }

  return (
    <div className="space-y-5">
      {rounds.map((round) => {
        const meta = STATE_META[round.status] || STATE_META.locked
        const StateIcon = meta.icon
        return (
          <Card
            key={round.round_id}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {round.name}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${meta.cls}`}>
                  <StateIcon className={`size-3 ${round.status === 'in_progress' ? 'animate-spin' : ''}`} />
                  {t(meta.key)}
                </span>
              </span>
            }
            subtitle={round.stage}
          >
            <div className={`grid gap-3 ${round.fixtures?.length > 1 ? 'sm:grid-cols-2' : ''}`}>
              {(round.fixtures || []).map((f) => {
                const played = f.status === 'finished'
                const winner = f.winner_team_id
                return (
                  <div key={f.id} className="overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-50/60">
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">
                      <div className={`flex min-w-0 items-center gap-2 ${winner && winner === f.home_team_id ? 'text-slate-900' : 'text-slate-500'}`}>
                        <TeamAvatar team={f.home_team} className="size-7" />
                        <span className="truncate text-xs font-bold">{f.home_team?.name || t('committee.detail.tbd')}</span>
                        {winner === f.home_team_id && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                      </div>
                      <span className="text-base font-black text-slate-900">
                        {played ? `${f.home_score} - ${f.away_score}` : <span className="text-slate-400">vs</span>}
                      </span>
                      <div className={`flex min-w-0 items-center justify-end gap-2 ${winner && winner === f.away_team_id ? 'text-slate-900' : 'text-slate-500'}`}>
                        {winner === f.away_team_id && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                        <span className="truncate text-xs font-bold">{f.away_team?.name || t('committee.detail.tbd')}</span>
                        <TeamAvatar team={f.away_team} className="size-7" />
                      </div>
                    </div>
                    {(f.source_home_fixture_id || f.source_away_fixture_id) && (
                      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-1.5">
                        {renderSource(f.source_home_fixture_id)}
                        {renderSource(f.source_away_fixture_id)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
