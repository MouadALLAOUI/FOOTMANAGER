import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  ChevronDown,
  Clock,
  MapPin,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import { TeamAvatar } from '../shared'
import { formatGroupName } from '../../../lib/groupNames'
import { extractOrderedGroupsFromFixtures, getGroupColor } from '../../../lib/groupColors'
import { selectClass } from '../../../components/dashboard/ui'

const LIVE_STATUSES = ['warmup', 'kickoff', 'first_half', 'halftime', 'second_half', 'extra_time', 'penalties']

function matchStatus(f) {
  const raw = f.match?.status || f.status || 'scheduled'
  if (raw === 'played') return 'finished'
  return LIVE_STATUSES.includes(raw) ? 'live' : raw
}

const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'ماي',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

function formatArabicDateHeader(dateKey) {
  if (!dateKey || dateKey === 'unscheduled') return 'مباريات قيد تحديد الموعد'
  const d = new Date(`${dateKey}T12:00:00`)
  if (Number.isNaN(d.getTime())) return dateKey
  return `${ARABIC_WEEKDAYS[d.getDay()]} ${d.getDate()} ${ARABIC_MONTHS[d.getMonth()]}`
}

function FilterSelect({ label, value, onChange, options }) {
  const { t } = useTranslation()
  return (
    <label className="flex items-center gap-2">
      <span className="shrink-0 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">{label}</span>
      <select
        className={`${selectClass} h-9 rounded-xl px-3 text-xs`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{t('public.tournamentPage.all')}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function FixturesSection({ fixtures, mode = 'all', onOpen }) {
  const { t } = useTranslation()
  const [statusTab, setStatusTab] = useState(mode === 'finished' ? 'finished' : mode === 'upcoming' ? 'upcoming' : 'all')
  const [round, setRound] = useState('')
  const [group, setGroup] = useState('')
  const [collapsedDays, setCollapsedDays] = useState({})

  const validFixtures = useMemo(
    () => (fixtures || []).filter((f) => f.home_team && f.away_team),
    [fixtures],
  )
  const orderedGroups = useMemo(() => extractOrderedGroupsFromFixtures(validFixtures), [validFixtures])

  const list = useMemo(() => {
    const arr = [...validFixtures]
    if (statusTab === 'upcoming') {
      return arr
        .filter((f) => matchStatus(f) !== 'finished')
        .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
    }
    if (statusTab === 'finished') {
      return arr
        .filter((f) => matchStatus(f) === 'finished')
        .sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0))
    }
    return arr.sort((a, b) => {
      if (!a.scheduled_at && !b.scheduled_at) return (a.id || 0) - (b.id || 0)
      if (!a.scheduled_at) return 1
      if (!b.scheduled_at) return -1
      return new Date(a.scheduled_at) - new Date(b.scheduled_at)
    })
  }, [validFixtures, statusTab])

  // Opening match ID (earliest scheduled match in the tournament)
  const openingMatchId = useMemo(() => {
    const scheduled = [...validFixtures]
      .filter((f) => f.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    return scheduled[0]?.id ?? validFixtures[0]?.id ?? null
  }, [validFixtures])

  const roundOptions = useMemo(() => {
    const seen = new Map()
    for (const f of validFixtures) if (f.round?.name && !seen.has(f.round.name)) seen.set(f.round.name, f.round.name)
    return [...seen.values()].map((name) => ({ value: name, label: name }))
  }, [validFixtures])

  const groupOptions = useMemo(() => {
    const seen = new Map()
    for (const f of validFixtures) {
      if (f.group?.name && !seen.has(f.group.name)) {
        seen.set(f.group.name, {
          value: f.group.name,
          label: formatGroupName(f.group.name, { groupId: f.group.id }),
        })
      }
    }
    return [...seen.values()]
  }, [validFixtures])

  const filtered = list.filter((f) => {
    if (round && f.round?.name !== round) return false
    if (group && f.group?.name !== group) return false
    return true
  })

  // Group matches chronologically by date (Matches Master Reference Screen 4)
  const dateSections = useMemo(() => {
    const map = new Map()
    for (const f of filtered) {
      const dateKey = f.scheduled_at ? f.scheduled_at.slice(0, 10) : 'unscheduled'
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey).push(f)
    }
    return [...map.entries()].map(([dateKey, items]) => ({
      dateKey,
      label: formatArabicDateHeader(dateKey),
      items,
    }))
  }, [filtered])

  if (validFixtures.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
          <Swords className="size-6" />
        </span>
        <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">
          {t('public.tournamentPage.noMatches')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Sub-filter bar: الكل | القادمة | النتائج + Optional Group/Round filter */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-1 shadow-2xs w-full sm:w-auto sm:min-w-[280px]">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'upcoming', label: 'القادمة' },
            { key: 'finished', label: 'النتائج' },
          ].map((tab) => {
            const isActive = statusTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusTab(tab.key)}
                className={`flex h-9 items-center justify-center rounded-xl px-3 text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                    : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] hover:bg-[#E9ECE7] dark:hover:bg-[#303832]'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {(roundOptions.length > 1 || groupOptions.length > 1) && (
          <div className="flex flex-wrap items-center gap-2">
            {groupOptions.length > 1 && (
              <FilterSelect
                label={t('public.tournamentPage.filterGroup')}
                value={group}
                onChange={setGroup}
                options={groupOptions}
              />
            )}
            {roundOptions.length > 1 && (
              <FilterSelect
                label={t('public.tournamentPage.filterRound')}
                value={round}
                onChange={setRound}
                options={roundOptions}
              />
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-14 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
            <Users className="size-5" />
          </span>
          <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">
            {statusTab === 'finished' ? t('public.tournamentPage.noResults') : t('public.tournamentPage.noMatches')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dateSections.map((daySec) => {
            const isCollapsed = Boolean(collapsedDays[daySec.dateKey])
            return (
              <div
                key={daySec.dateKey}
                className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs"
              >
                {/* Collapsible Day Header (Matches Master Reference Screen 4) */}
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedDays((prev) => ({ ...prev, [daySec.dateKey]: !prev[daySec.dateKey] }))
                  }
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start transition-colors hover:bg-[#F7F8F5]/70 dark:hover:bg-[#252B27]/50 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Calendar className="size-4 shrink-0 text-[#111313] dark:text-[#D0FF38]" />
                    <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                      {daySec.label}
                    </span>
                    <span className="rounded-full bg-[#F7F8F5] dark:bg-[#252B27] px-2 py-0.5 text-[10px] font-black text-[#65706A] dark:text-[#B2B9B3]">
                      {daySec.items.length}
                    </span>
                  </div>

                  <ChevronDown
                    className={`size-4 shrink-0 text-[#65706A] dark:text-[#B2B9B3] transition-transform ${
                      isCollapsed ? '' : 'rotate-180'
                    }`}
                  />
                </button>

                {/* Compact Match Rows */}
                {!isCollapsed && (
                  <div className="border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 p-2.5 sm:p-3 space-y-2">
                    {daySec.items.map((f) => {
                      const st = matchStatus(f)
                      const played = st === 'finished'
                      const live = st === 'live'
                      const isOpening = f.id === openingMatchId
                      const clickable = Boolean(onOpen) && Boolean(f.match?.id ?? f.match_id)
                      const gColor = f.group ? getGroupColor(f.group, orderedGroups) : null
                      const timeStr = f.scheduled_at ? f.scheduled_at.slice(11, 16) : '—:—'
                      const pens =
                        played && f.match?.home_penalties != null
                          ? `(${f.match.home_penalties}-${f.match.away_penalties})`
                          : null

                      return (
                        <div
                          key={f.id}
                          role={clickable ? 'button' : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault()
                              onOpen(f)
                            }
                          }}
                          onClick={() => clickable && onOpen(f)}
                          className={`w-full rounded-2xl border p-3 text-start transition-all ${
                            gColor ? 'border-s-4' : ''
                          } ${
                            isOpening
                              ? 'border-[#B8F000] dark:border-[#D0FF38]/60 bg-[#B8F000]/20 dark:bg-[#D0FF38]/12'
                              : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/60 dark:bg-[#252B27]/50 hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
                          } ${clickable ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'}`}
                          style={gColor ? { borderInlineStartColor: gColor.hex } : undefined}
                        >
                          {/* Top Meta Row: Opening Badge / Group / Stadium + Kickoff Time */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              {isOpening && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#B8F000] dark:bg-[#D0FF38] px-2.5 py-0.5 text-[11px] font-black text-[#111313]">
                                  <Trophy className="size-3" />
                                  <span>المباراة الافتتاحية</span>
                                </span>
                              )}
                              {f.group?.name ? (
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${gColor ? gColor.badgeCls : 'bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] text-[#65706A] dark:text-[#B2B9B3]'}`}>
                                  {gColor && <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: gColor.hex }} />}
                                  <span>{formatGroupName(f.group.name, { groupId: f.group.id })}</span>
                                </span>
                              ) : !isOpening && f.round?.name ? (
                                <span className="inline-flex items-center rounded-md bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-2 py-0.5 text-[10px] font-black text-[#65706A] dark:text-[#B2B9B3]">
                                  {f.round.name}
                                </span>
                              ) : null}

                              {f.stadium?.name && (
                                <span className="truncate text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3] inline-flex items-center gap-0.5">
                                  <MapPin className="size-2.5 shrink-0" />
                                  <span className="truncate">{f.stadium.name}</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {live && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#D93636] px-2 py-0.5 text-[9px] font-black text-white animate-pulse">
                                  LIVE 🔴
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-xs font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
                                <span>{timeStr}</span>
                                <Clock className="size-3.5 text-[#65706A] dark:text-[#B2B9B3]" />
                              </span>
                            </div>
                          </div>

                          {/* Center Teams Row */}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            {/* Home Team (Right in RTL) */}
                            {f.home_team?.id != null ? (
                              <Link
                                to={`/teams/${f.home_team.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="group/team flex items-center gap-2 min-w-0 hover:opacity-85 transition-opacity"
                              >
                                <TeamAvatar team={f.home_team} className="size-7 sm:size-8 shrink-0" />
                                <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] group-hover/team:underline">
                                  {f.home_team?.name || '—'}
                                </span>
                              </Link>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                <TeamAvatar team={f.home_team} className="size-7 sm:size-8 shrink-0" />
                                <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                                  {f.home_team?.name || '—'}
                                </span>
                              </div>
                            )}

                            {/* Score or VS */}
                            <div className="shrink-0 px-2 text-center">
                              {played || live ? (
                                <div className="flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-2.5 py-0.5 text-xs font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums shadow-2xs">
                                    <span>{f.match?.home_score ?? 0}</span>
                                    <span className="text-[#65706A] font-sans">-</span>
                                    <span>{f.match?.away_score ?? 0}</span>
                                  </span>
                                  {pens && <span className="text-[9px] font-bold text-[#65706A] mt-0.5">{pens}</span>}
                                </div>
                              ) : (
                                <span className="text-xs font-black text-[#65706A] dark:text-[#B2B9B3]">VS</span>
                              )}
                            </div>

                            {/* Away Team (Left in RTL) */}
                            {f.away_team?.id != null ? (
                              <Link
                                to={`/teams/${f.away_team.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="group/team flex items-center justify-end gap-2 min-w-0 hover:opacity-85 transition-opacity"
                              >
                                <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] group-hover/team:underline">
                                  {f.away_team?.name || '—'}
                                </span>
                                <TeamAvatar team={f.away_team} className="size-7 sm:size-8 shrink-0" />
                              </Link>
                            ) : (
                              <div className="flex items-center justify-end gap-2 min-w-0">
                                <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                                  {f.away_team?.name || '—'}
                                </span>
                                <TeamAvatar team={f.away_team} className="size-7 sm:size-8 shrink-0" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
