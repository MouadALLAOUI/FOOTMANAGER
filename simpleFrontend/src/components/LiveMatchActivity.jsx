import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Activity, Radio } from 'lucide-react'
import { Skeleton } from './dashboard/ui'
import TeamLogo from './profile/TeamLogo'

const EVENT_META = {
  goal: { icon: '⚽', labelKey: 'committee.result.ev.goal' },
  own_goal: { icon: '⚽', labelKey: 'committee.result.ev.goal' },
  penalty_goal: { icon: '🥅', labelKey: 'committee.result.ev.penaltyGoal' },
  missed_penalty: { icon: '❌', labelKey: 'committee.result.ev.penaltyGoal' },
  yellow_card: { icon: '🟨', labelKey: 'committee.result.ev.yellowCard' },
  second_yellow: { icon: '🟨🟥', labelKey: 'committee.result.ev.secondYellow' },
  red_card: { icon: '🟥', labelKey: 'committee.result.ev.redCard' },
  substitution: { icon: '🔄', labelKey: 'committee.result.ev.substitution' },
  injury: { icon: '🩹', labelKey: 'committee.result.ev.injury' },
  other: { icon: '📝', labelKey: 'committee.result.ev.note' },
}

function TeamSide({ team, name, score }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <TeamLogo team={team} name={name} className="size-9" rounded="rounded-xl" fontSize="text-sm" />
      <span className="truncate text-xs font-extrabold text-slate-800 sm:text-sm">{name || '—'}</span>
      <span className="ms-auto tabular-nums text-lg font-black text-slate-900">{score}</span>
    </div>
  )
}

function LiveMatchCard({ f, t }) {
  const m = f.match || {}
  const homeScore = m.home_score ?? 0
  const awayScore = m.away_score ?? 0
  const minute = m.current_minute ?? 0
  const events = m.events || []

  return (
    <div className="space-y-3 rounded-2xl border border-rose-100 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2">
        {f.round?.name && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-500">{f.round.name}</span>}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-600 ring-1 ring-rose-200">
          <span className="size-1.5 animate-pulse rounded-full bg-rose-500" />
          {t('committee.result.statusLive')}
          {minute > 0 && <span className="tabular-nums">{minute}'</span>}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <TeamSide team={f.home_team} name={f.home_team?.name} score={homeScore} />
        <span className="shrink-0 text-xs font-black text-slate-300">-</span>
        <TeamSide team={f.away_team} name={f.away_team?.name} score={awayScore} />
      </div>

      {events.length > 0 && (
        <div className="border-t border-slate-100 pt-2.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">
            <Activity className="size-3" />
            {t('committee.result.liveActivity')}
          </p>
          <ol className="space-y-1">
            {events.slice(0, 6).map((e) => {
              const meta = EVENT_META[e.type] || { icon: '•', labelKey: null }
              const player = e.player_name || e.player?.name || ''
              return (
                <li key={e.id} className="flex items-center gap-2 text-[11px]">
                  <span className="w-6 shrink-0 text-end tabular-nums font-black text-slate-400">{e.minute ?? 0}'</span>
                  <span className="shrink-0 text-sm leading-none">{meta.icon}</span>
                  {meta.labelKey && <span className="font-bold text-slate-500">{t(meta.labelKey)}</span>}
                  {player && <span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{player}</span>}
                  {e.team_name && <span className="shrink-0 text-[10px] text-slate-400">{e.team_name}</span>}
                </li>
              )
            })}
          </ol>
        </div>
      )}
    </div>
  )
}

export default function LiveMatchActivity({ load, deps = [], enabled = true, pollMs = 30000 }) {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchNow = () => {
    if (!enabled) return
    Promise.resolve(load())
      .then((list) => setData(list || []))
      .catch(() => { /* live section is optional; ignore transient errors */ })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    fetchNow()
    if (pollMs > 0) {
      const id = setInterval(fetchNow, pollMs)
      return () => clearInterval(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled])

  const list = data ?? []
  const noLive = !loading && list.length === 0

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-black text-white shadow-[0_6px_16px_rgba(225,29,72,0.3)]">
          <Radio className="size-3.5 animate-pulse" />
          {t('committee.result.liveMatches')}
        </span>
        <span className="hidden text-[11px] font-bold text-slate-400 sm:inline">{t('committee.result.liveMatchesDesc')}</span>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : noLive ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-8 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-white text-xl">⏸</span>
          <p className="text-sm font-bold text-slate-600">{t('committee.result.noLiveMatches')}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((f) => (
            <LiveMatchCard key={f.id} f={f} t={t} />
          ))}
        </div>
      )}
    </div>
  )
}
