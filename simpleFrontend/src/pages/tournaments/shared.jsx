import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  Crown,
  Flame,
  MapPin,
  Medal,
  Shield,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { Card, Badge } from '../../components/dashboard/ui'
import { formatTime, matchDay } from '../../lib/adapters'
import { logoThumb } from '../../lib/thumb'

export function TeamAvatar({ team, className = 'size-8' }) {
  if (!team) return <span className={`${className} grid shrink-0 place-items-center rounded-full bg-slate-200 text-slate-500`}>?</span>
  if (team.logo_url) return <img src={logoThumb(team)} alt="" className={`${className} shrink-0 rounded-full object-cover`} loading="lazy" />
  return (
    <span className={`${className} grid shrink-0 place-items-center rounded-full bg-green-100 text-xs font-black text-green-700`}>
      {(team.name || '؟').slice(0, 1)}
    </span>
  )
}

export function DrawGroups({ teams }) {
  const { t } = useTranslation()
  const groups = []
  const map = new Map()
  for (const p of teams || []) {
    const key = p.group?.id || 'unassigned'
    if (!map.has(key)) {
      map.set(key, [])
      groups.push({ key, name: p.group?.name || t('committee.detail.unassigned'), list: map.get(key) })
    }
    map.get(key).push(p.team)
  }
  if (groups.length === 0) return null
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.key} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-extrabold text-slate-900">{g.name}</h4>
            <Badge variant="info">{t('committee.detail.teamsCount', { count: g.list.length })}</Badge>
          </div>
          <div className="mt-3 space-y-2">
            {g.list.map((team) => (
              <div key={team?.id || Math.random()} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                <TeamAvatar team={team} className="size-7" />
                <span className="truncate text-xs font-bold text-slate-700">{team?.name || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StandingsTable({ groups }) {
  const { t } = useTranslation()
  const cols = ['#', 'team', 'played', 'wins', 'draws', 'losses', 'gf', 'ga', 'gd', 'points']
  return (
    <div className="space-y-6">
      {(groups || []).map((group) => (
        <Card key={group.group_id ?? 'unassigned'} title={group.name}>
          <div className="-mx-6 overflow-x-auto px-6">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {cols.map((c) => (
                    <th key={c} className="px-2 py-2.5 text-center first:text-start last:text-end">
                      {c === '#'
                        ? '#'
                        : c === 'team'
                          ? t('committee.detail.team')
                          : t(`committee.detail.col.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(group.rows || []).map((row, i) => (
                  <tr key={row.team_id} className="border-b border-slate-50 last:border-0">
                    <td className="px-2 py-3 text-center text-xs font-black text-slate-400">
                      {i + 1 <= 2 ? <Crown className={`mx-auto size-4 ${i === 0 ? 'text-amber-500' : 'text-slate-400'}`} /> : i + 1}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <TeamAvatar team={row.team} className="size-7" />
                        <span className="truncate font-bold text-slate-800">{row.team?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center font-semibold text-slate-600">{row.played}</td>
                    <td className="px-2 py-3 text-center font-semibold text-slate-600">{row.wins}</td>
                    <td className="px-2 py-3 text-center font-semibold text-slate-600">{row.draws}</td>
                    <td className="px-2 py-3 text-center font-semibold text-slate-600">{row.losses}</td>
                    <td className="px-2 py-3 text-center font-semibold text-slate-600">{row.goals_for}</td>
                    <td className="px-2 py-3 text-center font-semibold text-slate-600">{row.goals_against}</td>
                    <td className={`px-2 py-3 text-center font-bold ${row.goal_difference >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {row.goal_difference >= 0 ? '+' : ''}{row.goal_difference}
                    </td>
                    <td className="px-2 py-3 text-end text-base font-black text-slate-900">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}

export function BracketView({ rounds }) {
  const { t } = useTranslation()
  if (!rounds || rounds.length === 0) return null
  return (
    <div className="space-y-5">
      {(rounds || []).map((round) => (
        <Card key={round.round_id} title={round.name} subtitle={round.stage}>
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
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

function RankList({ title, icon: Icon, items }) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-amber-50 text-amber-600"><Icon className="size-4" /></span>
        <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
      </div>
      {(items || []).length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">—</p>
      ) : (
        <div className="space-y-1.5">
          {(items || []).map((row, i) => (
            <div key={row.player_id ?? i} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
              <span className="w-4 text-center text-[11px] font-black text-slate-400">{i + 1}</span>
              <TeamAvatar team={row.team_id ? { id: row.team_id } : null} className="size-6" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-700">{row.name || '—'}</p>
              </div>
              <Badge variant="info">{row.count}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StatisticsView({ stats }) {
  const { t } = useTranslation()
  const s = stats || {}
  const summary = s.summary || {}
  const highlight = (item) => (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
      <TeamAvatar team={item && { id: item.team_id, name: item.name, logo_url: item.logo_url }} className="size-7" />
      <span className="truncate text-xs font-bold text-slate-700">{item?.name || '—'}</span>
    </div>
  )
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
          <p className="text-2xl font-black text-slate-900">{summary.matches_played ?? 0}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{t('committee.detail.stat.matches')}</p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
          <p className="text-2xl font-black text-slate-900">{summary.total_goals ?? 0}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{t('committee.detail.stat.goals')}</p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
          <p className="text-2xl font-black text-slate-900">{summary.average_goals_per_match ?? 0}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{t('committee.detail.stat.avgGoals')}</p>
        </div>
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
          <p className="text-2xl font-black text-slate-900">{summary.scheduled ?? 0}</p>
          <p className="mt-0.5 text-xs font-semibold text-slate-500">{t('committee.detail.stat.upcoming')}</p>
        </div>
      </div>

      {s.champion && (
        <div className="flex items-center gap-4 rounded-3xl border border-amber-200/70 bg-gradient-to-l from-amber-50 to-white p-5">
          <span className="grid size-14 place-items-center rounded-2xl bg-amber-500 text-white shadow-[0_10px_24px_rgba(245,158,11,0.4)]">
            <Trophy className="size-7" />
          </span>
          <div>
            <p className="text-xs font-bold text-amber-600">{t('committee.detail.champion')}</p>
            <p className="text-lg font-black text-slate-900">{s.champion.name}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <RankList title={t('committee.detail.scorers')} icon={Target} items={s.top_scorers} />
        <RankList title={t('committee.detail.assists')} icon={Medal} items={s.top_assists} />
        <RankList title={t('committee.detail.cards')} icon={Flame} items={s.yellow_cards} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {s.best_attack && (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-emerald-600"><Target className="size-4" /><p className="text-xs font-bold">{t('committee.detail.bestAttack')}</p></div>
            {highlight(s.best_attack)}
            <p className="mt-2 text-[11px] font-semibold text-slate-400">{t('committee.detail.bestAttackDesc', { goals: s.best_attack.goals })}</p>
          </div>
        )}
        {s.best_defense && (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-sky-600"><Shield className="size-4" /><p className="text-xs font-bold">{t('committee.detail.bestDefense')}</p></div>
            {highlight(s.best_defense)}
            <p className="mt-2 text-[11px] font-semibold text-slate-400">{t('committee.detail.bestDefenseDesc', { goals: s.best_defense.goals_against })}</p>
          </div>
        )}
        {s.biggest_win && (
          <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
            <div className="mb-2 flex items-center gap-2 text-violet-600"><Flame className="size-4" /><p className="text-xs font-bold">{t('committee.detail.biggestWin')}</p></div>
            <div className="space-y-1.5">
              {highlight(s.biggest_win.home_team)}
              {highlight(s.biggest_win.away_team)}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-slate-400">{t('committee.detail.biggestWinDesc', { home: s.biggest_win.home_score, away: s.biggest_win.away_score })}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function FixtureRow({ f, onEdit, busy }) {
  const { t } = useTranslation()
  const played = f.match?.status === 'finished'
  const status = f.match?.status || f.status
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamAvatar team={f.home_team} className="size-8" />
        <span className="truncate text-xs font-bold text-slate-800">{f.home_team?.name || t('committee.detail.tbd')}</span>
      </div>
      <div className="flex min-w-[92px] flex-col items-center">
        {played ? (
          <span className="text-lg font-black text-slate-900">{f.match.home_score} - {f.match.away_score}</span>
        ) : (
          <>
            <span className="text-sm font-black text-slate-400">VS</span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
              {f.scheduled_at && <CalendarDays className="size-3" />}
              {f.scheduled_at ? `${matchDay(f.scheduled_at, 'ar')} ${formatTime(f.scheduled_at)}` : ''}
            </span>
          </>
        )}
        {f.stadium && !played && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
            <MapPin className="size-3" />
            {f.stadium.name}
          </span>
        )}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2.5">
        <span className="truncate text-xs font-bold text-slate-800">{f.away_team?.name || t('committee.detail.tbd')}</span>
        <TeamAvatar team={f.away_team} className="size-8" />
        {onEdit && status === 'scheduled' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(f)}
            className="ms-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-[11px] font-bold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
          >
            {t('committee.detail.enterResult')}
          </button>
        )}
      </div>
    </div>
  )
}

export function FixturesList({ fixtures, onEdit, busyId }) {
  const { t } = useTranslation()
  const sections = []
  const map = new Map()
  for (const f of fixtures || []) {
    const key = f.round?.name || '—'
    if (!map.has(key)) {
      map.set(key, [])
      sections.push({ name: key, group: f.group?.name, list: map.get(key) })
    }
    map.get(key).push(f)
  }
  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Users className="size-6" /></span>
        <p className="text-sm font-bold text-slate-600">{t('committee.detail.noFixtures')}</p>
      </div>
    )
  }
  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <Card key={i} title={section.name} subtitle={section.group}>
          <div className="space-y-2">
            {section.list.map((f) => (
              <FixtureRow key={f.id} f={f} onEdit={onEdit} busy={busyId === f.id} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
