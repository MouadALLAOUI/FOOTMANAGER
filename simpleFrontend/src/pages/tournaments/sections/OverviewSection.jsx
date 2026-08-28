import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarClock,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  Clock,
  Crown,
  Flag,
  Gauge,
  Info,
  Landmark,
  Layers,
  LayoutGrid,
  MapPin,
  Network,
  ScrollText,
  Swords,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import { TeamAvatar } from '../shared'
import { formatTime, matchDay } from '../../../lib/adapters'
import { formatTournamentDateRange } from '../list/shared'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import TournamentStageBar from '../../../components/tournaments/TournamentStageBar'

const STATUS_TONE = {
  open_for_registration: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  registration_closed: 'bg-amber-50 text-amber-700 ring-amber-200',
  in_progress: 'bg-sky-50 text-sky-700 ring-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
}

function currentStage(tour, fixtures, t) {
  if (!tour) return ''
  if (tour.status === 'completed') return t('public.tournamentPage.stageCompleted')
  if (tour.status === 'open_for_registration') return t('public.tournamentPage.stageRegistration')
  if (tour.status === 'registration_closed') return t('public.tournamentPage.stageReady')
  const list = fixtures || []
  const finished = list.filter((f) => f.match?.status === 'finished')
  const roundById = new Map(list.map((f) => [f.round?.id, f.round]).filter(([, r]) => r))
  const rounds = [...roundById.values()].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  for (let i = rounds.length - 1; i >= 0; i -= 1) {
    if (finished.some((f) => f.round?.id === rounds[i].id)) return rounds[i].name
  }
  return t('public.tournamentPage.groupStage')
}

function InfoPanel({ tour, stage }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const items = []

  const push = (key, icon, label, value) => {
    if (value) items.push({ key, icon, label, value })
  }

  push('dates', CalendarDays, t('public.tournamentPage.dates'), formatTournamentDateRange(tour.start_date, tour.end_date, lang))
  push('stage', Flag, t('public.tournamentPage.stage'), stage)
  push('location', MapPin, t('public.tournamentPage.location'), tour.location)
  push('stadium', Landmark, t('public.detail.stadium'), tour.stadium?.name)
  push('format', LayoutGrid, t('public.detail.format'), t(`committee.tournaments.formats.${tour.tournament_format}`))
  push('teams', Users, t('public.tournamentPage.teams'), `${tour.stats?.registered_teams ?? 0} / ${tour.teams_count ?? '—'}`)
  push('groups', Layers, t('public.detail.groups'), tour.groups_count ? String(tour.groups_count) : '')
  push('points', Gauge, t('public.detail.pointsSystem'), tour.points_for_win != null ? `W ${tour.points_for_win} · D ${tour.points_for_draw ?? 0} · L ${tour.points_for_loss ?? 0}` : '')
  push('duration', Clock, t('public.detail.matchDuration'), tour.match_duration_minutes ? `${tour.match_duration_minutes} min` : '')
  push('period', CalendarClock, t('public.detail.registrationPeriod'), formatTournamentDateRange(tour.registration_start_at, tour.registration_end_at, lang))
  push('fee', Wallet, t('public.detail.fee'), tour.requires_registration_fee ? `${tour.registration_fee ?? 0} DH` : t('public.registration.free'))

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
          <span className="grid size-8 place-items-center rounded-xl bg-green-50 text-green-600">
            <Info className="size-4" />
          </span>
          {t('public.detail.info')}
        </h3>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-black ring-1 ${STATUS_TONE[tour.status] || 'bg-slate-100 text-slate-500 ring-slate-200'}`}
        >
          {t(`status.${tour.status}`)}
        </span>
      </div>
      <dl className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div key={item.key} className="bg-white px-5 py-4">
            <dt className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              <item.icon className="size-3.5" />
              {item.label}
            </dt>
            <dd className="mt-1.5 truncate text-sm font-extrabold text-slate-900" dir="auto">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ChampionBanner({ champion, edition }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const team = { id: champion.team_id, name: champion.name, logo_url: champion.logo_url }

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-[0_18px_40px_-18px_rgba(217,119,6,0.55)]">
      <div className="absolute inset-0 bg-gradient-to-l from-amber-400 via-amber-300 to-yellow-200" />
      <div className="absolute -end-10 -top-14 size-48 rounded-full bg-white/40 blur-3xl" />
      <div className="absolute -start-6 bottom-0 size-24 rounded-full bg-amber-500/30 blur-2xl" />
      <div className="relative flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-slate-950 text-amber-400 shadow-[0_16px_30px_-10px_rgba(15,23,42,0.7)]">
            <Trophy className="size-8" fill="currentColor" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-900/70">{t('public.detail.champion')}</p>
            {edition && <p className="text-[11px] font-bold text-amber-900/70">{t('public.detail.winnerOf', { edition })}</p>}
            <p className="truncate text-xl font-black text-slate-900 sm:text-2xl">{champion.name || '—'}</p>
          </div>
        </div>
        <div className="shrink-0">
          <TeamAvatar
            team={team}
            className="size-16 rounded-3xl ring-4 ring-white/70"
            onClick={team.id != null ? () => openTeam(team) : undefined}
          />
        </div>
      </div>
    </div>
  )
}

function RulesCard({ rules }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-start"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
          <ScrollText className="size-4" />
        </span>
        <span className="text-sm font-black text-slate-900">{t('public.detail.rules')}</span>
        <span className="ms-auto text-[11px] font-bold text-slate-400">
          {open ? t('public.detail.rulesHide') : t('public.detail.rulesShow')}
        </span>
        <ChevronDown className={`size-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">{rules}</p>
        </div>
      )}
    </div>
  )
}

function NextMatchCard({ fixture, t, lang }) {
  const f = fixture
  const { openTeam } = useProfileModal()
  const dayTime = f.scheduled_at ? `${matchDay(f.scheduled_at, lang)} ${formatTime(f.scheduled_at)}` : ''

  return (
    <div className="overflow-hidden rounded-3xl border border-green-200/70 bg-gradient-to-br from-green-50/90 via-white to-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2 px-5 pt-4">
        <span className="grid size-7 place-items-center rounded-lg bg-green-500 text-white shadow-[0_8px_18px_-6px_rgba(22,163,74,0.6)]">
          <Swords className="size-3.5" />
        </span>
        <p className="text-xs font-black text-green-700">{t('public.tournamentPage.nextMatch')}</p>
        {f.round?.name && (
          <span className="ms-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">{f.round.name}</span>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamAvatar
            team={f.home_team}
            className="size-10"
            onClick={f.home_team?.id != null ? () => openTeam(f.home_team) : undefined}
          />
          <span className="truncate text-sm font-extrabold text-slate-900">{f.home_team?.name || '—'}</span>
        </div>
        <div className="flex flex-col items-center px-1">
          <span className="text-base font-black text-slate-400">VS</span>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2.5">
          <span className="truncate text-sm font-extrabold text-slate-900">{f.away_team?.name || '—'}</span>
          <TeamAvatar
            team={f.away_team}
            className="size-10"
            onClick={f.away_team?.id != null ? () => openTeam(f.away_team) : undefined}
          />
        </div>
      </div>
      {(dayTime || f.stadium?.name) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-green-100/70 px-5 py-2.5 text-[11px] font-semibold text-slate-400">
          {dayTime && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" />
              {dayTime}
            </span>
          )}
          {f.stadium?.name && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {f.stadium.name}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function LatestResults({ fixtures, t, onOpen }) {
  const { openTeam } = useProfileModal()
  const results = (fixtures || [])
    .filter((f) => f.match?.status === 'finished')
    .slice()
    .sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0))
    .slice(0, 5)

  if (results.length === 0) return null

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <p className="mb-4 flex items-center gap-2 text-xs font-black text-slate-700">
        <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-500">
          <Trophy className="size-3.5" />
        </span>
        {t('public.tournamentPage.latestResults')}
      </p>
      <div className="space-y-2">
        {results.map((f) => {
          const winnerId = f.match?.winner_team_id
          const canOpen = Boolean(onOpen) && Boolean(f.match?.id ?? f.match_id)
          const teamCls = (isWinner) =>
            `flex min-w-0 flex-1 items-center gap-2 rounded-xl px-1.5 py-1 transition-colors ${
              isWinner ? 'font-black text-emerald-700' : 'font-bold text-slate-700'
            }`
          return (
            <div key={f.id} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-1.5 transition-all hover:border-green-200 hover:bg-white hover:shadow-[0_10px_24px_-12px_rgba(16,185,129,0.4)]">
              <button
                type="button"
                onClick={f.home_team?.id != null ? () => openTeam(f.home_team) : undefined}
                className={`${teamCls(winnerId === f.home_team?.id)} justify-start hover:text-green-700`}
              >
                <TeamAvatar team={f.home_team} className="size-6" />
                <span className="truncate">{f.home_team?.name || '—'}</span>
              </button>
              <button
                type="button"
                onClick={canOpen ? () => onOpen(f) : undefined}
                disabled={!canOpen}
                aria-label={t('public.matchDetail.title')}
                className="group/score inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-black tabular-nums text-white transition-colors hover:bg-green-700 disabled:opacity-80"
              >
                {f.match.home_score} - {f.match.away_score}
                {canOpen && <ChevronLeft className="size-3 transition-transform group-hover/score:-translate-x-0.5 rtl:-scale-x-100 rtl:group-hover/score:translate-x-0.5" />}
              </button>
              <button
                type="button"
                onClick={f.away_team?.id != null ? () => openTeam(f.away_team) : undefined}
                className={`${teamCls(winnerId === f.away_team?.id)} justify-end hover:text-green-700`}
              >
                <span className="truncate">{f.away_team?.name || '—'}</span>
                <TeamAvatar team={f.away_team} className="size-6" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CurrentLeader({ standings, t }) {
  const { openTeam } = useProfileModal()
  const groups = standings?.groups || []
  const rows = (groups[0]?.rows || []).filter((r) => r.team)
  const leader = rows[0]
  if (!leader) return null

  return (
    <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <p className="mb-4 flex items-center gap-2 text-xs font-black text-amber-700">
        <span className="grid size-7 place-items-center rounded-lg bg-amber-500 text-white">
          <Crown className="size-3.5" />
        </span>
        {t('public.tournamentPage.currentLeader')}
        {groups[0]?.name && <span className="ms-auto text-[10px] font-bold text-slate-400">{groups[0].name}</span>}
      </p>
      <button type="button" onClick={() => openTeam(leader.team)} className="flex w-full items-center gap-3 text-start">
        <TeamAvatar team={leader.team} className="size-12 ring-2 ring-amber-300" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-black text-slate-900">{leader.team.name}</span>
          <span className="text-[11px] font-bold text-slate-400">
            {t('public.tournamentPage.leaderLine', { played: leader.played, wins: leader.wins, draws: leader.draws, losses: leader.losses })}
          </span>
        </span>
        <span className="text-center">
          <span className="block text-3xl font-black tabular-nums text-amber-600">{leader.points}</span>
          <span className="text-[10px] font-bold text-slate-400">{t('public.tournamentPage.points')}</span>
        </span>
      </button>
    </div>
  )
}

export default function OverviewSection({ tour, fixtures, standings, stats, bracket, onOpen }) {
  const { t, i18n } = useTranslation()

  const upcoming = (fixtures || []).find(
    (f) => !['finished', 'cancelled', 'postponed'].includes(f.match?.status) && f.home_team && f.away_team,
  )
  const stage = currentStage(tour, fixtures, t)
  const champion = tour.status === 'completed' ? stats?.champion : null
  const isKnockout = ['groups_knockout', 'knockout_only'].includes(tour.tournament_format)
  const showStage = isKnockout && (bracket?.length ?? 0) > 1

  return (
    <div className="space-y-6">
      {champion?.name && <ChampionBanner champion={champion} edition={tour.edition} />}

      <InfoPanel tour={tour} stage={stage} />

      {showStage && (
        <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <p className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-900 text-white">
              <Network className="size-4" />
            </span>
            {t('public.tournamentPage.phase')}
            <span className="ms-auto text-[11px] font-bold text-slate-400">{stage}</span>
          </p>
          <TournamentStageBar rounds={bracket} />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {tour.description && <p className="text-sm leading-relaxed text-slate-600">{tour.description}</p>}
          {upcoming && <NextMatchCard fixture={upcoming} t={t} lang={i18n.language} />}
          {tour.rules && <RulesCard rules={tour.rules} />}
        </div>
        <div className="space-y-5">
          <LatestResults fixtures={fixtures} t={t} onOpen={onOpen} />
          <CurrentLeader standings={standings} t={t} />
        </div>
      </div>
    </div>
  )
}