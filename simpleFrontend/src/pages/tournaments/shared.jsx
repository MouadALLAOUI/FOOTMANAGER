import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
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
import { formatGroupName } from '../../lib/groupNames'
import TeamLogo from '../../components/profile/TeamLogo'
import { useProfileModal } from '../../components/profile/ProfileModalContext'

export function TeamAvatar({ team, className = 'size-8', onClick }) {
  return <TeamLogo team={team} className={className} onClick={onClick} />
}

export function DrawGroups({ teams }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const [collapsedMap, setCollapsedMap] = useState({})

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
    <div className="space-y-3">
      {groups.map((g, idx) => {
        const isCollapsed = collapsedMap[g.key] ?? false
        const groupTitle =
          g.key === 'unassigned'
            ? String(g.name || '')
            : formatGroupName(g.name, { groupId: g.key })

        return (
          <div
            key={g.key || idx}
            className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs"
          >
            <button
              type="button"
              onClick={() => setCollapsedMap((prev) => ({ ...prev, [g.key]: !isCollapsed }))}
              className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition-colors hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#D0FF38]">
                  <Users className="size-4" />
                </span>
                <h4 className="truncate text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
                  {groupTitle}
                </h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="rounded-full bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 px-2.5 py-0.5 text-[11px] font-black text-[#111313] dark:text-[#D0FF38]">
                  {t('committee.detail.teamsCount', { count: g.list.length })}
                </span>
                <ChevronDown
                  className={`size-4 text-[#65706A] dark:text-[#B2B9B3] transition-transform ${
                    isCollapsed ? '' : 'rotate-180'
                  }`}
                />
              </div>
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-[#E1E5DF]/70 dark:divide-[#303832]/70 border-t border-[#E1E5DF] dark:border-[#303832] px-3 py-1.5">
                {g.list.map((team, tIdx) => (
                  <div
                    key={team?.id || tIdx}
                    onClick={team?.id != null ? () => openTeam(team) : undefined}
                    className="flex items-center justify-between gap-3 py-2.5 px-1 rounded-xl transition-colors hover:bg-[#F7F8F5]/70 dark:hover:bg-[#252B27]/60 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamAvatar team={team} className="size-8 shrink-0" />
                      <span className="min-w-0 truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                        {team?.name || '—'}
                      </span>
                    </div>
                    {team?.city && (
                      <span className="shrink-0 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                        {team.city}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function StandingsTable({ groups }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const [collapsedGroups, setCollapsedGroups] = useState({})

  return (
    <div className="space-y-4">
      {(groups || []).map((group, gIdx) => {
        const gKey = group.group_id ?? group.name ?? gIdx
        const isCollapsed = Boolean(collapsedGroups[gKey])
        const displayGroupTitle = formatGroupName(group.name, {
          groupId: group.group_id,
          emptyLabel: 'جدول الترتيب',
        })

        return (
          <div
            key={gKey}
            className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs"
          >
            {/* Group Header (Matches Master Reference Screen 5) */}
            <button
              type="button"
              onClick={() => setCollapsedGroups((prev) => ({ ...prev, [gKey]: !prev[gKey] }))}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-3 sm:px-5 sm:py-3.5 text-start transition-colors hover:bg-[#F7F8F5]/70 dark:hover:bg-[#252B27]/60 cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <BarChart3 className="size-4 shrink-0 text-[#111313] dark:text-[#D0FF38]" />
                <h3 className="truncate text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
                  {displayGroupTitle}
                </h3>
                {group.rows?.length ? (
                  <span className="rounded-full bg-[#F7F8F5] dark:bg-[#252B27] px-2 py-0.5 text-[10px] font-black text-[#65706A] dark:text-[#B2B9B3]">
                    {t('committee.detail.teamsCount', { count: group.rows.length })}
                  </span>
                ) : null}
              </div>

              <ChevronDown
                className={`size-4 shrink-0 text-[#65706A] dark:text-[#B2B9B3] transition-transform ${
                  isCollapsed ? '' : 'rotate-180'
                }`}
              />
            </button>

            {/* Complete Standings Table — ZERO Horizontal Scroll on Mobile */}
            {!isCollapsed && (
              <div className="w-full overflow-x-hidden border-t border-[#E1E5DF] dark:border-[#303832]">
                <table className="w-full table-fixed border-collapse text-center">
                  <colgroup>
                    <col className="w-[26px] sm:w-[38px]" />
                    <col className="w-auto" />
                    <col className="w-[22px] sm:w-[36px]" />
                    <col className="w-[22px] sm:w-[36px]" />
                    <col className="w-[22px] sm:w-[36px]" />
                    <col className="w-[22px] sm:w-[36px]" />
                    <col className="w-[24px] sm:w-[40px]" />
                    <col className="w-[24px] sm:w-[40px]" />
                    <col className="w-[28px] sm:w-[44px]" />
                    <col className="w-[34px] sm:w-[52px]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[10px] sm:text-xs font-black text-[#65706A] dark:text-[#B2B9B3]">
                      <th className="py-2 px-0.5 text-center">#</th>
                      <th className="py-2 px-1 text-start">{t('committee.detail.team', 'الفريق')}</th>
                      <th className="py-2 px-0.5 text-center" title="لعب">لعب</th>
                      <th className="py-2 px-0.5 text-center" title="فوز">{t('committee.detail.col.wins', 'ف')}</th>
                      <th className="py-2 px-0.5 text-center" title="تعادل">{t('committee.detail.col.draws', 'ت')}</th>
                      <th className="py-2 px-0.5 text-center" title="خسارة">{t('committee.detail.col.losses', 'خ')}</th>
                      <th className="py-2 px-0.5 text-center" title="له">{t('committee.detail.col.gf', 'له')}</th>
                      <th className="py-2 px-0.5 text-center" title="عليه">{t('committee.detail.col.ga', 'عليه')}</th>
                      <th className="py-2 px-0.5 text-center" title="فارق الأهداف">+/-</th>
                      <th className="py-2 px-0.5 text-center" title="النقاط">{t('committee.detail.col.points', 'نقاط')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1E5DF]/70 dark:divide-[#303832]/70">
                    {(group.rows || []).map((row, i) => {
                      const isFirst = i === 0
                      const gd = row.goal_difference ?? 0
                      const isWithdrawn = row.status === 'withdrawn' || row.team?.status === 'withdrawn'
                      const isDisqualified = row.status === 'disqualified' || row.team?.status === 'disqualified'

                      return (
                        <tr
                          key={row.team_id ?? i}
                          className={`transition-colors hover:bg-[#F7F8F5]/70 dark:hover:bg-[#252B27]/50 ${
                            isFirst ? 'bg-[#B8F000]/15 dark:bg-[#D0FF38]/10' : ''
                          }`}
                        >
                          {/* Rank # */}
                          <td className="py-2.5 px-0.5 text-center align-middle">
                            <span
                              className={`mx-auto inline-flex size-5 sm:size-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-black tabular-nums ${
                                isFirst
                                  ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                                  : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2]'
                              }`}
                            >
                              {i + 1}
                            </span>
                          </td>

                          {/* Team Logo + Name */}
                          <td className="py-2.5 px-1 text-start align-middle min-w-0">
                            <button
                              type="button"
                              onClick={row.team?.id != null ? () => openTeam(row.team) : undefined}
                              className="flex w-full items-center gap-1.5 sm:gap-2 min-w-0 text-start cursor-pointer"
                              title={row.team?.name || ''}
                            >
                              <TeamAvatar team={row.team} className="size-5 sm:size-6 shrink-0" />
                              <span className="min-w-0 flex-1 truncate text-[11px] sm:text-xs md:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                                {row.team?.name || '—'}
                              </span>
                              {isWithdrawn && (
                                <span className="shrink-0 rounded bg-[#D97706]/15 px-1 py-0.5 text-[8px] sm:text-[10px] font-black text-[#D97706] dark:text-[#FFC857]">
                                  منسحب
                                </span>
                              )}
                              {isDisqualified && (
                                <span className="shrink-0 rounded bg-[#D92D20]/15 px-1 py-0.5 text-[8px] sm:text-[10px] font-black text-[#D92D20] dark:text-[#FF6868]">
                                  مُقصى
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Played (لعب) */}
                          <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#111313] dark:text-[#F5F7F2] tabular-nums">
                            {row.played ?? 0}
                          </td>

                          {/* Wins (ف) */}
                          <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#111313] dark:text-[#F5F7F2] tabular-nums">
                            {row.wins ?? 0}
                          </td>

                          {/* Draws (ت) */}
                          <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                            {row.draws ?? 0}
                          </td>

                          {/* Losses (خ) */}
                          <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                            {row.losses ?? 0}
                          </td>

                          {/* Goals For (له) */}
                          <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                            {row.goals_for ?? 0}
                          </td>

                          {/* Goals Against (عليه) */}
                          <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                            {row.goals_against ?? 0}
                          </td>

                          {/* Goal Difference (+/-) */}
                          <td
                            dir="ltr"
                            className={`py-2.5 px-0.5 text-[10px] sm:text-xs font-black tabular-nums ${
                              gd > 0
                                ? 'text-[#111313] dark:text-[#42D889]'
                                : gd < 0
                                  ? 'text-[#D93636] dark:text-[#FF6868]'
                                  : 'text-[#65706A] dark:text-[#B2B9B3]'
                            }`}
                          >
                            {gd > 0 ? `+${gd}` : gd}
                          </td>

                          {/* Points (نقاط) */}
                          <td className="py-2.5 px-0.5 text-center align-middle">
                            <span
                              className={`mx-auto inline-flex min-w-[24px] sm:min-w-[30px] items-center justify-center rounded-lg px-1.5 py-0.5 text-[11px] sm:text-xs font-black tabular-nums ${
                                isFirst
                                  ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                                  : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2]'
                              }`}
                            >
                              {row.points ?? 0}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function BracketView({ rounds, onOpen }) {
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
              const canOpen = Boolean(onOpen) && Boolean(f.match_id)
              const inner = (
                <>
                  <div className={`flex min-w-0 items-center gap-2 ${winner && winner === f.home_team_id ? 'text-[#111313] dark:text-[#F5F7F2]' : 'text-[#65706A] dark:text-[#B2B9B3]'}`}>
                    <TeamAvatar team={f.home_team} className="size-7" />
                    <span className="truncate text-xs font-bold">{f.home_team?.name || t('committee.detail.tbd')}</span>
                    {winner === f.home_team_id && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-base font-black tabular-nums text-[#111313] dark:text-[#D0FF38]">
                      {played ? `${f.home_score} - ${f.away_score}` : <span className="text-[#65706A]">VS</span>}
                    </span>
                    {played && f.home_penalties != null && (
                      <span className="text-[9px] font-bold text-[#65706A]">
                        p {f.home_penalties}-{f.away_penalties}
                      </span>
                    )}
                  </div>
                  <div className={`flex min-w-0 items-center justify-end gap-2 ${winner && winner === f.away_team_id ? 'text-[#111313] dark:text-[#F5F7F2]' : 'text-[#65706A] dark:text-[#B2B9B3]'}`}>
                    {winner === f.away_team_id && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                    <span className="truncate text-xs font-bold">{f.away_team?.name || t('committee.detail.tbd')}</span>
                    <TeamAvatar team={f.away_team} className="size-7" />
                  </div>
                  {canOpen && <ChevronLeft className="size-4 shrink-0 self-center text-[#65706A] transition-colors group-hover:text-[#111313] rtl:rotate-180" />}
                </>
              )
              return canOpen ? (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onOpen({ ...f, match: { id: f.match_id } })}
                  className="group grid w-full grid-cols-[1fr_auto_1fr_auto] items-center gap-2 overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 text-start transition-all hover:border-[#B8F000] hover:bg-white dark:hover:bg-[#1B201D] cursor-pointer"
                >
                  {inner}
                </button>
              ) : (
                <div key={f.id} className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27]">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">{inner}</div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}

export function RankList({ title, icon: Icon, items }) {
  return (
    <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-2xs">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]">
          <Icon className="size-4" />
        </span>
        <h4 className="text-sm font-extrabold text-[#111313] dark:text-[#F5F7F2]">{title}</h4>
      </div>
      {(items || []).length === 0 ? (
        <p className="py-4 text-center text-xs text-[#65706A] dark:text-[#B2B9B3]">—</p>
      ) : (
        <div className="space-y-1.5">
          {(items || []).map((row, i) => (
            <div key={row.player_id ?? i} className="flex items-center gap-2.5 rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-2">
              <span className="w-4 shrink-0 text-center text-[11px] font-black text-[#65706A] dark:text-[#B2B9B3]">{i + 1}</span>
              <TeamAvatar team={{ id: row.team_id, name: row.team_name, logo_url: row.team_logo_url }} className="size-6" />
              <div className="min-w-0 flex-1">
                {row.player_id ? (
                  <Link
                    to={`/players/${row.player_id}`}
                    className="block truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2] transition-colors hover:underline"
                  >
                    {row.name || '—'}
                  </Link>
                ) : (
                  <p className="truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">{row.name || '—'}</p>
                )}
                {row.team_name && <p className="truncate text-[10px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">{row.team_name}</p>}
              </div>
              <Badge variant="info">{row.count}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function StatisticsSummary({ stats }) {
  const { t } = useTranslation()
  const s = stats || {}
  const summary = s.summary || {}
  const highlight = (item) => (
    <div className="flex items-center gap-2.5 rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-2">
      <TeamAvatar team={item && { id: item.team_id, name: item.name, logo_url: item.logo_url }} className="size-7" />
      <span className="truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">{item?.name || '—'}</span>
    </div>
  )
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-2xs">
          <p className="text-2xl font-black text-[#111313] dark:text-[#D0FF38] tabular-nums">{summary.matches_played ?? 0}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#65706A] dark:text-[#B2B9B3]">{t('committee.detail.stat.matches')}</p>
        </div>
        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-2xs">
          <p className="text-2xl font-black text-[#111313] dark:text-[#D0FF38] tabular-nums">{summary.total_goals ?? 0}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#65706A] dark:text-[#B2B9B3]">{t('committee.detail.stat.goals')}</p>
        </div>
        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-2xs">
          <p className="text-2xl font-black text-[#111313] dark:text-[#D0FF38] tabular-nums">{summary.average_goals_per_match ?? 0}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#65706A] dark:text-[#B2B9B3]">{t('committee.detail.stat.avgGoals')}</p>
        </div>
        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-2xs">
          <p className="text-2xl font-black text-[#111313] dark:text-[#D0FF38] tabular-nums">{summary.scheduled ?? 0}</p>
          <p className="mt-0.5 text-xs font-semibold text-[#65706A] dark:text-[#B2B9B3]">{t('committee.detail.stat.upcoming')}</p>
        </div>
      </div>

      {s.champion && (
        <div className="flex items-center gap-4 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-gradient-to-l from-amber-50 to-white dark:from-[#252B27] dark:to-[#1B201D] p-5 shadow-xs">
          <span className="grid size-14 place-items-center rounded-2xl bg-amber-500 text-white shadow-[0_10px_24px_rgba(245,158,11,0.4)]">
            <Trophy className="size-7" />
          </span>
          <div>
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{t('committee.detail.champion')}</p>
            <p className="text-lg font-black text-[#111313] dark:text-[#D0FF38]">{s.champion.name}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {s.best_attack && (
          <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5">
            <div className="mb-2 flex items-center gap-2 text-[#179955] dark:text-[#42D889]"><Target className="size-4" /><p className="text-xs font-bold">{t('committee.detail.bestAttack')}</p></div>
            {highlight(s.best_attack)}
            <p className="mt-2 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">{t('committee.detail.bestAttackDesc', { goals: s.best_attack.goals })}</p>
          </div>
        )}
        {s.best_defense && (
          <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5">
            <div className="mb-2 flex items-center gap-2 text-sky-600 dark:text-sky-400"><Shield className="size-4" /><p className="text-xs font-bold">{t('committee.detail.bestDefense')}</p></div>
            {highlight(s.best_defense)}
            <p className="mt-2 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">{t('committee.detail.bestDefenseDesc', { goals: s.best_defense.goals_against })}</p>
          </div>
        )}
        {s.biggest_win && (
          <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5">
            <div className="mb-2 flex items-center gap-2 text-violet-600 dark:text-violet-400"><Flame className="size-4" /><p className="text-xs font-bold">{t('committee.detail.biggestWin')}</p></div>
            <div className="space-y-1.5">
              {highlight(s.biggest_win.home_team)}
              {highlight(s.biggest_win.away_team)}
            </div>
            <p className="mt-2 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">{t('committee.detail.biggestWinDesc', { home: s.biggest_win.home_score, away: s.biggest_win.away_score })}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export function StatisticsView({ stats }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <StatisticsSummary stats={stats} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RankList title={t('committee.detail.scorers')} icon={Target} items={stats?.top_scorers} />
        <RankList title={t('committee.detail.assists')} icon={Medal} items={stats?.top_assists} />
        <RankList title={t('committee.detail.yellowCards')} icon={Flame} items={stats?.yellow_cards} />
        <RankList title={t('committee.detail.redCards')} icon={Shield} items={stats?.red_cards} />
      </div>
    </div>
  )
}

export function FixtureRow({ f, onEdit, busy }) {
  const { t } = useTranslation()
  const played = f.match?.status === 'finished'
  const status = f.match?.status || f.status
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-4 py-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamAvatar team={f.home_team} className="size-8" />
        <span className="truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">{f.home_team?.name || t('committee.detail.tbd')}</span>
      </div>
      <div className="flex min-w-[92px] flex-col items-center">
        {played ? (
          <span className="text-lg font-black text-[#111313] dark:text-[#D0FF38]">{f.match.home_score} - {f.match.away_score}</span>
        ) : (
          <>
            <span className="text-sm font-black text-[#65706A]">VS</span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
              {f.scheduled_at && <CalendarDays className="size-3" />}
              {f.scheduled_at ? `${matchDay(f.scheduled_at, 'ar')} ${formatTime(f.scheduled_at)}` : ''}
            </span>
          </>
        )}
        {f.stadium && !played && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
            <MapPin className="size-3" />
            {f.stadium.name}
          </span>
        )}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-2.5">
        <span className="truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">{f.away_team?.name || t('committee.detail.tbd')}</span>
        <TeamAvatar team={f.away_team} className="size-8" />
        {onEdit && status === 'scheduled' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onEdit(f)}
            className="ms-1 rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] px-2.5 py-1.5 text-[11px] font-black text-[#111313] transition-opacity hover:opacity-90 disabled:opacity-50"
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
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]"><Users className="size-6" /></span>
        <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">{t('committee.detail.noFixtures')}</p>
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
