import { useMemo, useState } from 'react'
import { coverThumb } from '../../../lib/thumb'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flag,
  Flame,
  Hand,
  Info,
  Landmark,
  Layers,
  LayoutGrid,
  MapPin,
  Shield,
  ShieldCheck,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
import { TeamAvatar } from '../shared'
import { formatTime, matchDay } from '../../../lib/adapters'
import { formatTournamentDateRange } from '../list/shared'
import { formatGroupName } from '../../../lib/groupNames'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import { Skeleton } from '../../../components/dashboard/ui'
import Collapsible from '../../../components/tournaments/Collapsible'

function toTeam(info) {
  if (!info) return null
  return { id: info.team_id ?? info.id, name: info.name, logo_url: info.logo_url }
}

function buildFormMap(standings) {
  const map = {}
  for (const group of standings?.groups || []) {
    for (const row of group.rows || []) {
      const id = row.team_id ?? row.team?.id
      if (id != null && Array.isArray(row.form)) map[id] = row.form
    }
  }
  return map
}

const FORM_STYLES = {
  W: { cls: 'bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889]', text: 'W' },
  D: { cls: 'bg-[#D9822B]/15 text-[#D9822B] dark:bg-[#FFC857]/20 dark:text-[#FFC857]', text: 'D' },
  L: { cls: 'bg-[#D93636]/15 text-[#D93636] dark:bg-[#FF6868]/20 dark:text-[#FF6868]', text: 'L' },
}

function FormRow({ form = [], align = 'start' }) {
  const { t } = useTranslation()
  if (!form || form.length === 0) return null
  const labelFor = (r) =>
    r === 'W' ? t('public.overview.formW') : r === 'D' ? t('public.overview.formD') : t('public.overview.formL')
  return (
    <div
      className={`mt-1 flex items-center gap-1 ${
        align === 'end' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
      }`}
    >
      {form.slice(-5).map((r, idx) => {
        const s = FORM_STYLES[r] || FORM_STYLES.D
        return (
          <span
            key={idx}
            title={labelFor(r)}
            className={`grid size-4 sm:size-4.5 place-items-center rounded-full text-[8px] sm:text-[9px] font-black leading-none ${s.cls}`}
          >
            {s.text}
          </span>
        )
      })}
    </div>
  )
}

function EmptyBlock({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
        <Icon className="size-4.5" />
      </span>
      <p className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">{text}</p>
    </div>
  )
}

function PlayerThumb({ player }) {
  const src = coverThumb(player?.photo_url)
  const initial = (player?.name || '?').trim().charAt(0)
  return src ? (
    <img src={src} alt={player?.name || ''} className="size-9 shrink-0 rounded-xl object-cover ring-1 ring-[#E1E5DF] dark:ring-[#303832]" />
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-xs font-black text-[#111313] dark:text-[#D0FF38]">
      {initial}
    </span>
  )
}

/**
 * Section 6 — 4-Column Tournament Statistics Strip with Circular Lime Progress Ring
 * Matches the attached reference screenshot:
 * 16 فريقاً | 24 مباراة | 18 مباراة منجزة | 75% نسبة التقدم
 */
function QuickInfoStrip({ tour, stats }) {
  const teams = tour?.stats?.registered_teams ?? tour?.max_teams ?? 0
  const totalMatches = tour?.stats?.fixtures ?? stats?.summary?.total_matches ?? 0
  const played = tour?.stats?.finished_matches ?? stats?.summary?.matches_played ?? 0
  const progress = totalMatches > 0 ? Math.min(100, Math.round((played / totalMatches) * 100)) : 0

  // SVG circle parameters
  const size = 34
  const strokeWidth = 3.5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (progress / 100) * circumference

  return (
    <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-3 px-2 sm:px-4 sm:py-3.5 shadow-2xs">
      <div className="grid grid-cols-4 divide-x divide-x-reverse divide-[#E1E5DF] dark:divide-[#303832] items-center">
        {/* 1. Teams Count */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-3">
          <Users className="size-4.5 sm:size-5 shrink-0 text-[#111313] dark:text-[#D0FF38]" strokeWidth={2} />
          <div className="text-center sm:text-start min-w-0">
            <p className="text-sm sm:text-lg font-black leading-none text-[#111313] dark:text-[#F5F7F2] tabular-nums">
              {teams}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] truncate">
              فريقاً
            </p>
          </div>
        </div>

        {/* 2. Total Matches */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-3">
          <Swords className="size-4.5 sm:size-5 shrink-0 text-[#111313] dark:text-[#D0FF38]" strokeWidth={2} />
          <div className="text-center sm:text-start min-w-0">
            <p className="text-sm sm:text-lg font-black leading-none text-[#111313] dark:text-[#F5F7F2] tabular-nums">
              {totalMatches}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] truncate">
              مباراة
            </p>
          </div>
        </div>

        {/* 3. Completed Matches */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-3">
          <CheckCircle2 className="size-4.5 sm:size-5 shrink-0 text-[#179955] dark:text-[#42D889]" strokeWidth={2.2} />
          <div className="text-center sm:text-start min-w-0">
            <p className="text-sm sm:text-lg font-black leading-none text-[#111313] dark:text-[#F5F7F2] tabular-nums">
              {played}
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] truncate">
              مباراة منجزة
            </p>
          </div>
        </div>

        {/* 4. Progress Ring + Percentage */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 px-1.5 sm:px-3">
          <div className="relative shrink-0 grid place-items-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-[#E9ECE7] dark:text-[#252B27]"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="text-[#B8F000] dark:text-[#D0FF38] transition-all duration-500"
              />
            </svg>
          </div>
          <div className="text-center sm:text-start min-w-0">
            <p className="text-sm sm:text-lg font-black leading-none text-[#111313] dark:text-[#F5F7F2] tabular-nums">
              {progress}%
            </p>
            <p className="mt-0.5 text-[10px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] truncate">
              نسبة التقدم
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Section 7 — Upcoming Match Card ("المباراة القادمة")
 * Unified AJI NQSSRO Match Card layout matching the reference screenshot.
 */
function NextMatchCard({ fixture, tour, standings, loading }) {
  const { t, i18n } = useTranslation()
  const { openTeam } = useProfileModal()
  const formMap = useMemo(() => buildFormMap(standings), [standings])
  const lang = i18n.language

  const stageLabel = useMemo(() => {
    if (!fixture) return null
    if (fixture.group?.name) {
      return formatGroupName(fixture.group.name, { groupId: fixture.group.id, tournamentId: tour?.id })
    }
    if (fixture.round?.name) return fixture.round.name
    if (tour?.tournament_format === 'league') return 'الدوري'
    return null
  }, [fixture, tour])

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-5 shadow-2xs">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-7 sm:size-8 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
            <CalendarDays className="size-4" />
          </span>
          <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
            {t('public.overview.nextMatch', 'المباراة القادمة')}
          </h3>
        </div>

        {stageLabel && (
          <span className="shrink-0 rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-0.5 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
            {stageLabel}
          </span>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : fixture ? (
        <div>
          {/* Teams & VS/Time Row */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 py-2">
            {/* Home Team (Right in RTL) */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <TeamAvatar
                team={fixture.home_team}
                className="size-9 sm:size-11 shrink-0"
                onClick={fixture.home_team?.id != null ? () => openTeam(fixture.home_team) : undefined}
              />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  disabled={fixture.home_team?.id == null}
                  onClick={() => fixture.home_team?.id != null && openTeam(fixture.home_team)}
                  className="block max-w-full truncate text-start text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] hover:underline cursor-pointer"
                >
                  {fixture.home_team?.name || t('committee.detail.tbd')}
                </button>
                <FormRow form={formMap[fixture.home_team?.id]} align="start" />
              </div>
            </div>

            {/* Center: VS + Time Pill */}
            <div className="flex flex-col items-center justify-center px-1">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#65706A] dark:text-[#B2B9B3]">
                VS
              </span>
              <span className="mt-1 inline-flex items-center justify-center rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-1 text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] tabular-nums shadow-2xs">
                {fixture.scheduled_at ? formatTime(fixture.scheduled_at) : '—:—'}
              </span>
            </div>

            {/* Away Team (Left in RTL) */}
            <div className="flex items-center justify-end gap-2 sm:gap-3 min-w-0">
              <div className="min-w-0 flex-1 text-end">
                <button
                  type="button"
                  disabled={fixture.away_team?.id == null}
                  onClick={() => fixture.away_team?.id != null && openTeam(fixture.away_team)}
                  className="ms-auto block max-w-full truncate text-end text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] hover:underline cursor-pointer"
                >
                  {fixture.away_team?.name || t('committee.detail.tbd')}
                </button>
                <FormRow form={formMap[fixture.away_team?.id]} align="end" />
              </div>
              <TeamAvatar
                team={fixture.away_team}
                className="size-9 sm:size-11 shrink-0"
                onClick={fixture.away_team?.id != null ? () => openTeam(fixture.away_team) : undefined}
              />
            </div>
          </div>

          {/* Bottom Venue / Date Bar */}
          {(fixture.stadium?.name || fixture.scheduled_at) && (
            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-3 border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 pt-2.5 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
              {fixture.stadium?.name && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5 text-[#179955] dark:text-[#D0FF38]" />
                  <span>{fixture.stadium.name}</span>
                </span>
              )}
              {fixture.scheduled_at && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  <span>{matchDay(fixture.scheduled_at, lang)}</span>
                </span>
              )}
            </div>
          )}
        </div>
      ) : (
        <EmptyBlock icon={CalendarDays} text={t('public.overview.noNextMatch')} />
      )}
    </div>
  )
}

/**
 * Section 8 — Recent Results Card ("آخر النتائج")
 * Uses the unified compact Match Row layout from the reference screenshot.
 */
function RecentResults({ fixtures, loading, onOpen, onShowTab }) {
  const { t, i18n } = useTranslation()
  const { openTeam } = useProfileModal()
  const lang = i18n.language

  const list = useMemo(() => {
    return (fixtures || [])
      .filter((f) => f.home_team && f.away_team && f.match?.status === 'finished')
      .slice()
      .sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0))
      .slice(0, 4)
  }, [fixtures])

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 sm:size-8 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
            <Clock className="size-4" />
          </span>
          <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
            {t('public.overview.recentResults', 'آخر النتائج')}
          </h3>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : list.length > 0 ? (
        <div>
          <div className="divide-y divide-[#E1E5DF]/70 dark:divide-[#303832]/70">
            {list.map((f) => {
              const clickable = Boolean(onOpen) && Boolean(f.match?.id ?? f.match_id)
              const pens =
                f.match?.home_penalties != null
                  ? `(${f.match.home_penalties}-${f.match.away_penalties})`
                  : null
              const dayStr = f.scheduled_at ? matchDay(f.scheduled_at, lang) : ''
              const timeStr = f.scheduled_at ? formatTime(f.scheduled_at) : ''

              return (
                <div
                  key={f.id}
                  onClick={() => clickable && onOpen(f)}
                  className={`grid grid-cols-[56px_1fr_auto_1fr] sm:grid-cols-[78px_1fr_auto_1fr] items-center gap-1.5 sm:gap-2.5 py-2.5 transition-colors ${
                    clickable
                      ? 'cursor-pointer hover:bg-[#F7F8F5]/70 dark:hover:bg-[#252B27]/50 rounded-xl px-1'
                      : ''
                  }`}
                >
                  {/* Date & Time Column (Right in RTL) */}
                  <div className="text-start leading-tight">
                    {dayStr && (
                      <p className="text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3] line-clamp-2">
                        {dayStr}
                      </p>
                    )}
                    {timeStr && (
                      <p className="text-[10px] font-bold text-[#65706A]/85 dark:text-[#B2B9B3]/85 tabular-nums">
                        {timeStr}
                      </p>
                    )}
                  </div>

                  {/* Home Team */}
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                    <TeamAvatar
                      team={f.home_team}
                      className="size-6 sm:size-7 shrink-0"
                      onClick={(e) => {
                        if (f.home_team?.id != null) {
                          e?.stopPropagation?.()
                          openTeam(f.home_team)
                        }
                      }}
                    />
                    <span className="min-w-0 truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                      {f.home_team.name}
                    </span>
                  </div>

                  {/* Center Score Pill */}
                  <div className="flex flex-col items-center px-1">
                    <span
                      dir="ltr"
                      className="inline-flex min-w-[52px] sm:min-w-[60px] items-center justify-center rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-1 text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] tabular-nums shadow-2xs"
                    >
                      {f.match.home_score} - {f.match.away_score}
                    </span>
                    {pens && <span className="mt-0.5 text-[9px] font-bold text-[#65706A]">{pens}</span>}
                  </div>

                  {/* Away Team */}
                  <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
                    <span className="min-w-0 truncate text-end text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                      {f.away_team.name}
                    </span>
                    <TeamAvatar
                      team={f.away_team}
                      className="size-6 sm:size-7 shrink-0"
                      onClick={(e) => {
                        if (f.away_team?.id != null) {
                          e?.stopPropagation?.()
                          openTeam(f.away_team)
                        }
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {onShowTab && (
            <div className="mt-2.5 border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 pt-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => onShowTab('matches')}
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#179955] dark:text-[#D0FF38] hover:underline cursor-pointer"
              >
                <span>{t('public.overview.viewAllMatches', 'عرض جميع المباريات')}</span>
                <ArrowLeft className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyBlock icon={Flag} text={t('public.overview.noRecentResults')} />
      )}
    </div>
  )
}

/**
 * Section 9 — Standings Preview ("الترتيب")
 * Complete 10-column zero-horizontal-scroll Standings Table preview matching the reference screenshot.
 */
function StandingsMini({ standings, tour, loading, onShowTab }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const rawGroups = standings?.groups || []
  // Requirement 3: HIDE EMPTY GROUPS
  const groups = rawGroups.filter((g) => (g.rows?.length || 0) > 0)
  const [groupIdx, setGroupIdx] = useState(0)
  const active = groups[groupIdx] || groups[0]
  const rows = (active?.rows || []).slice(0, 4)

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="grid size-7 sm:size-8 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
            <Trophy className="size-4" />
          </span>
          <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
            {t('public.overview.standingsPreview', 'الترتيب')}
          </h3>
        </div>

        {/* Group Selector Pills if multiple groups exist */}
        {groups.length > 1 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {groups.map((g, idx) => {
              const gLabel = formatGroupName(g.name, { groupId: g.group_id, tournamentId: tour?.id })
              return (
                <button
                  key={g.group_id ?? g.name ?? idx}
                  type="button"
                  onClick={() => setGroupIdx(idx)}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-black transition-colors cursor-pointer ${
                    idx === groupIdx
                      ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313]'
                      : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2]'
                  }`}
                >
                  {gLabel}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-4">
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : rows.length > 0 ? (
        <div>
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
                  <th className="py-2 px-0.5 text-center" title="فوز">ف</th>
                  <th className="py-2 px-0.5 text-center" title="تعادل">ت</th>
                  <th className="py-2 px-0.5 text-center" title="خسارة">خ</th>
                  <th className="py-2 px-0.5 text-center" title="له">له</th>
                  <th className="py-2 px-0.5 text-center" title="عليه">عليه</th>
                  <th className="py-2 px-0.5 text-center" title="فارق الأهداف">+/-</th>
                  <th className="py-2 px-0.5 text-center" title="النقاط">نقاط</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E5DF]/70 dark:divide-[#303832]/70">
                {rows.map((row, idx) => {
                  const isFirst = idx === 0
                  const gd = row.goal_difference ?? (row.goals_for ?? 0) - (row.goals_against ?? 0)
                  return (
                    <tr
                      key={row.team_id ?? idx}
                      className={`transition-colors hover:bg-[#F7F8F5]/70 dark:hover:bg-[#252B27]/50 ${
                        isFirst ? 'bg-[#B8F000]/18 dark:bg-[#D0FF38]/10' : ''
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
                          {idx + 1}
                        </span>
                      </td>

                      {/* Team Logo + Name */}
                      <td className="py-2.5 px-1 text-start align-middle min-w-0">
                        <button
                          type="button"
                          disabled={row.team?.id == null}
                          onClick={() => row.team?.id != null && openTeam(row.team)}
                          className="flex w-full items-center gap-1.5 sm:gap-2 min-w-0 text-start cursor-pointer"
                          title={row.team?.name || ''}
                        >
                          <TeamAvatar team={row.team} className="size-5 sm:size-6 shrink-0" />
                          <span className="min-w-0 flex-1 truncate text-[11px] sm:text-xs md:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                            {row.team?.name || '—'}
                          </span>
                        </button>
                      </td>

                      {/* Played */}
                      <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#111313] dark:text-[#F5F7F2] tabular-nums">
                        {row.played ?? 0}
                      </td>

                      {/* Wins */}
                      <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#111313] dark:text-[#F5F7F2] tabular-nums">
                        {row.wins ?? 0}
                      </td>

                      {/* Draws */}
                      <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                        {row.draws ?? 0}
                      </td>

                      {/* Losses */}
                      <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                        {row.losses ?? 0}
                      </td>

                      {/* GF */}
                      <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                        {row.goals_for ?? 0}
                      </td>

                      {/* GA */}
                      <td className="py-2.5 px-0.5 text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
                        {row.goals_against ?? 0}
                      </td>

                      {/* GD (+/-) */}
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

                      {/* Points */}
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

          {onShowTab && (
            <div className="border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 px-4 py-2.5 flex justify-end">
              <button
                type="button"
                onClick={() => onShowTab('standings')}
                className="inline-flex items-center gap-1.5 text-xs font-black text-[#179955] dark:text-[#D0FF38] hover:underline cursor-pointer"
              >
                <span>{t('public.overview.viewFullTable', 'عرض الترتيب الكامل')}</span>
                <ArrowLeft className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          <EmptyBlock icon={Trophy} text={t('public.tournamentPage.noStandings')} />
        </div>
      )}
    </div>
  )
}

/**
 * Section 10 — Tournament Records ("أرقام قياسية")
 * Matches the 4-tile horizontal record cards in the reference screenshot.
 */
function RecordsCard({ stats, loading }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  if (loading) return <Skeleton className="h-40 rounded-2xl" />

  const bw = stats?.biggest_win
  const highGoals = stats?.highest_scoring_team || stats?.best_attack
  const cleanTeam = stats?.most_clean_sheets_team
  const streak = stats?.longest_win_streak

  const tiles = [
    {
      key: 'biggestWin',
      icon: Flame,
      iconTone: 'text-[#D93636] dark:text-[#FF6868]',
      label: t('public.overview.biggestWin', 'أكبر فوز'),
      figure: bw ? `${bw.home_score} - ${bw.away_score}` : '—',
      team: bw ? bw.winner?.name || bw.home_team?.name || '' : null,
      target: bw ? toTeam(bw.winner || bw.home_team) : null,
    },
    {
      key: 'cleanSheets',
      icon: Shield,
      iconTone: 'text-[#179955] dark:text-[#42D889]',
      label: t('public.overview.mostCleanSheetsTeam', 'أكثر شباك نظيفة'),
      figure: cleanTeam ? `${cleanTeam.clean_sheets}` : '—',
      team: cleanTeam?.name || null,
      target: toTeam(cleanTeam),
    },
    {
      key: 'highestScoring',
      icon: Target,
      iconTone: 'text-[#0284C7] dark:text-[#38BDF8]',
      label: t('public.overview.highestScoringTeam', 'أكثر أهدافاً'),
      figure: highGoals ? `${highGoals.goals} هدفاً` : '—',
      team: highGoals?.name || null,
      target: toTeam(highGoals),
    },
    {
      key: 'winStreak',
      icon: Award,
      iconTone: 'text-[#D9822B] dark:text-[#FFC857]',
      label: t('public.overview.longestWinStreak', 'أكثر الانتصارات متتالية'),
      figure: streak ? `${streak.streak}` : '—',
      team: streak?.name || null,
      target: toTeam(streak),
    },
  ]

  const hasAny = Boolean(bw || highGoals || cleanTeam || streak)

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-5 shadow-2xs">
      <div className="flex items-center gap-2 mb-3">
        <span className="grid size-7 sm:size-8 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
          <Award className="size-4" />
        </span>
        <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
          {t('public.overview.records', 'أرقام قياسية')}
        </h3>
      </div>

      {hasAny ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {tiles.map((tile) => (
            <div
              key={tile.key}
              className="flex flex-col items-center justify-between rounded-2xl border border-[#E1E5DF]/80 dark:border-[#303832]/80 bg-[#F7F8F5] dark:bg-[#252B27] p-3 text-center"
            >
              <span className={`grid size-8 place-items-center rounded-xl bg-white dark:bg-[#1B201D] shadow-2xs ${tile.iconTone}`}>
                <tile.icon className="size-4" />
              </span>
              <p className="mt-2 text-[10px] sm:text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] leading-snug">
                {tile.label}
              </p>
              <p className="mt-1 truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]" dir="auto">
                {tile.figure}
              </p>
              {tile.team ? (
                <button
                  type="button"
                  disabled={tile.target?.id == null}
                  onClick={() => tile.target?.id != null && openTeam(tile.target)}
                  className="mt-0.5 block max-w-full truncate text-[10px] sm:text-[11px] font-bold text-[#111313]/80 dark:text-[#F5F7F2]/80 hover:underline cursor-pointer"
                >
                  {tile.team}
                </button>
              ) : (
                <span className="mt-0.5 text-[10px] text-[#65706A]">—</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlock icon={Award} text={t('public.overview.noRecords')} />
      )}
    </div>
  )
}

/**
 * Additional Tournament Info & Key Stats (Preserved in clean collapsible cards)
 */
function InfoPanel({ tour }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const dates = formatTournamentDateRange(tour.start_date, tour.end_date, lang)
  const venue = [tour.location, tour.stadium?.name].filter(Boolean).join(' • ')
  const format = tour.tournament_format ? t(`committee.tournaments.formats.${tour.tournament_format}`) : null
  const category = [tour.category, tour.edition].filter(Boolean).join(' • ')

  const rows = [
    dates && { icon: CalendarDays, label: t('public.overview.dates'), value: dates },
    venue && { icon: MapPin, label: t('public.overview.venue'), value: venue },
    tour.organizer?.name && { icon: Landmark, label: t('public.overview.organizer'), value: tour.organizer.name },
    format && { icon: Flag, label: t('public.overview.format'), value: format },
    category && { icon: Award, label: t('public.overview.category'), value: category },
    tour.group_count && { icon: LayoutGrid, label: t('public.overview.groups'), value: tour.group_count },
    tour.teams_per_group && { icon: Layers, label: t('public.overview.teamsPerGroup'), value: tour.teams_per_group },
    tour.match_duration && {
      icon: Swords,
      label: t('public.overview.matchDuration'),
      value: `${tour.match_duration} ${t('public.overview.minutesUnit')}`,
    },
  ].filter(Boolean)

  if (rows.length === 0 && !tour.description) return null

  return (
    <Collapsible icon={Info} title={t('public.overview.tournamentInfo', 'معلومات البطولة')} defaultOpen={false}>
      <div className="space-y-4">
        {tour.description && (
          <div className="rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#65706A] dark:text-[#B2B9B3]">
              {t('public.overview.about')}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-xs sm:text-sm leading-relaxed text-[#111313] dark:text-[#F5F7F2]">
              {tour.description}
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((r, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-2.5"
              >
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#D0FF38] shadow-2xs">
                  <r.icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">{r.label}</p>
                  <p className="mt-0.5 truncate text-xs font-extrabold text-[#111313] dark:text-[#F5F7F2]">{r.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Collapsible>
  )
}

function deriveBestAttack(stats, standings) {
  if (stats?.best_attack?.name) return stats.best_attack
  let best = null
  for (const g of standings?.groups || []) {
    for (const r of g.rows || []) {
      const goals = r.goals_for ?? 0
      if (goals <= 0) continue
      if (!best || goals > best.goals) {
        best = {
          team_id: r.team_id ?? r.team?.id,
          name: r.team?.name,
          logo_url: r.team?.logo_url,
          goals,
        }
      }
    }
  }
  return best
}

function deriveBestDefense(stats, standings) {
  if (stats?.best_defense?.name) return stats.best_defense
  let best = null
  for (const g of standings?.groups || []) {
    for (const r of g.rows || []) {
      if ((r.played ?? 0) === 0) continue
      const ga = r.goals_against ?? 0
      if (!best || ga < best.goals_against) {
        best = {
          team_id: r.team_id ?? r.team?.id,
          name: r.team?.name,
          logo_url: r.team?.logo_url,
          goals_against: ga,
        }
      }
    }
  }
  return best
}

function KeyStats({ stats, standings, loading }) {
  const { t } = useTranslation()
  const { openTeam, openPlayer } = useProfileModal()
  if (loading) return null

  const attack = deriveBestAttack(stats, standings)
  const defense = deriveBestDefense(stats, standings)
  const scorer = stats?.top_scorers?.[0] || null
  const keeper = stats?.best_goalkeeper || stats?.clean_sheets?.[0] || null

  if (!attack && !defense && !scorer && !keeper) return null

  return (
    <Collapsible icon={ShieldCheck} title={t('public.overview.keyStats', 'إحصائيات بارزة')} defaultOpen={false}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Best Attack */}
        <div className="rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
          <div className="flex items-center gap-2 text-[#179955] dark:text-[#42D889]">
            <Flame className="size-4" />
            <span className="text-[11px] font-black">{t('public.overview.bestAttack')}</span>
          </div>
          {attack ? (
            <button
              type="button"
              onClick={() => openTeam(toTeam(attack))}
              className="mt-2.5 flex w-full items-center gap-2.5 text-start cursor-pointer"
            >
              <TeamAvatar team={toTeam(attack)} className="size-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2]">{attack.name}</p>
                <p className="text-[11px] font-bold text-[#179955] dark:text-[#42D889]">
                  {t('public.overview.goalsCount', { count: attack.goals })}
                </p>
              </div>
            </button>
          ) : (
            <p className="mt-2 text-xs text-[#65706A]">—</p>
          )}
        </div>

        {/* Best Defense */}
        <div className="rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
            <ShieldCheck className="size-4" />
            <span className="text-[11px] font-black">{t('public.overview.bestDefense')}</span>
          </div>
          {defense ? (
            <button
              type="button"
              onClick={() => openTeam(toTeam(defense))}
              className="mt-2.5 flex w-full items-center gap-2.5 text-start cursor-pointer"
            >
              <TeamAvatar team={toTeam(defense)} className="size-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2]">{defense.name}</p>
                <p className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
                  {t('public.overview.concededCount', { count: defense.goals_against })}
                </p>
              </div>
            </button>
          ) : (
            <p className="mt-2 text-xs text-[#65706A]">—</p>
          )}
        </div>

        {/* Top Scorer */}
        <div className="rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
          <div className="flex items-center gap-2 text-[#D9822B] dark:text-[#FFC857]">
            <Target className="size-4" />
            <span className="text-[11px] font-black">{t('public.overview.topScorer')}</span>
          </div>
          {scorer ? (
            <button
              type="button"
              disabled={!scorer.player_id}
              onClick={() => scorer.player_id && openPlayer({ id: scorer.player_id, name: scorer.name })}
              className="mt-2.5 flex w-full items-center gap-2.5 text-start cursor-pointer"
            >
              <PlayerThumb player={scorer} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2]">{scorer.name}</p>
                <p className="truncate text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                  {scorer.team_name} • {scorer.count} أهداف
                </p>
              </div>
            </button>
          ) : (
            <p className="mt-2 text-xs text-[#65706A]">—</p>
          )}
        </div>

        {/* Best Goalkeeper */}
        <div className="rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
            <Hand className="size-4" />
            <span className="text-[11px] font-black">{t('public.overview.bestGoalkeeper')}</span>
          </div>
          {keeper ? (
            <button
              type="button"
              disabled={!keeper.player_id}
              onClick={() => keeper.player_id && openPlayer({ id: keeper.player_id, name: keeper.name })}
              className="mt-2.5 flex w-full items-center gap-2.5 text-start cursor-pointer"
            >
              <PlayerThumb player={keeper} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2]">{keeper.name}</p>
                <p className="truncate text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                  {keeper.team_name}
                </p>
              </div>
            </button>
          ) : (
            <p className="mt-2 text-xs text-[#65706A]">—</p>
          )}
        </div>
      </div>
    </Collapsible>
  )
}

export default function OverviewSection({ tour, fixtures, standings, stats, loading = {}, onOpen, onShowTab }) {
  const upcoming = useMemo(() => {
    const list = (fixtures || [])
      .filter((f) => f.home_team && f.away_team && f.match?.status !== 'finished')
      .slice()
      .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0))
    return list[0] || undefined
  }, [fixtures])

  return (
    <div className="space-y-4">
      {/* 1. 4-Column Tournament Statistics & Progress Strip */}
      <QuickInfoStrip tour={tour} stats={stats} />

      {/* 2. Main Overview Grid: Next Match -> Recent Results -> Standings Preview -> Records */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <NextMatchCard fixture={upcoming} tour={tour} standings={standings} loading={loading.fixtures} />
          <RecentResults fixtures={fixtures} loading={loading.fixtures} onOpen={onOpen} onShowTab={onShowTab} />
        </div>
        <div className="space-y-4">
          <StandingsMini standings={standings} tour={tour} loading={loading.standings} onShowTab={onShowTab} />
          <RecordsCard stats={stats} loading={loading.stats} />
        </div>
      </div>

      {/* 3. Expandable Additional Details & Key Stats */}
      <InfoPanel tour={tour} />
      <KeyStats stats={stats} standings={standings} loading={loading.stats} />
    </div>
  )
}
