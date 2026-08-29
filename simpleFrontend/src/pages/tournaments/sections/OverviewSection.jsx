import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  Award,
  CalendarDays,
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
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import { Skeleton } from '../../../components/dashboard/ui'
import Collapsible from '../../../components/tournaments/Collapsible'

const CARD = 'rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]'

function toTeam(info) {
  if (!info) return null
  return { id: info.team_id ?? info.id, name: info.name, logo_url: info.logo_url }
}

function buildFormMap(standings) {
  const map = {}
  for (const group of standings?.groups || []) {
    for (const row of group.rows || []) {
      if (row.team) map[row.team_id] = row.form
    }
  }
  return map
}

function FormBadges({ form }) {
  const marks = (form || []).slice(-5)
  if (!marks.length) return <span className="text-[10px] font-semibold text-slate-300">—</span>
  return (
    <div className="flex items-center gap-1">
      {marks.map((mark, i) => (
        <span
          key={i}
          className={`grid size-5 place-items-center rounded-full text-[9px] font-black ${
            mark === 'W'
              ? 'bg-emerald-100 text-emerald-700'
              : mark === 'D'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-rose-100 text-rose-600'
          }`}
        >
          {mark}
        </span>
      ))}
    </div>
  )
}

function EmptyBlock({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-300"><Icon className="size-6" /></span>
      <p className="text-sm font-bold text-slate-600">{text}</p>
    </div>
  )
}

function InfoCell({ item }) {
  const { openTeam } = useProfileModal()
  const Icon = item.icon
  return (
    <div className="flex w-full flex-col items-center gap-2 text-center">
      <span className="z-10 grid size-12 place-items-center rounded-full bg-green-50 text-green-600 ring-4 ring-white">
        <Icon className="size-5" />
      </span>
      <p className="text-[11px] font-bold text-slate-400">{item.label}</p>
      {item.champion ? (
        item.champion ? (
          <button
            type="button"
            onClick={() => item.champion.id != null && openTeam(item.champion)}
            className="flex max-w-full items-center gap-1.5"
          >
            <TeamAvatar team={item.champion} className="size-6" />
            <span className="truncate text-sm font-extrabold text-slate-900">{item.champion.name}</span>
          </button>
        ) : (
          <span className="text-sm font-extrabold text-slate-300">—</span>
        )
      ) : (
        <p className="max-w-full truncate text-sm font-extrabold text-slate-900" dir="auto">{item.value}</p>
      )}
    </div>
  )
}

function QuickInfoStrip({ tour, stats }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const stadium = tour.stadium
  const champion = toTeam(stats?.champion)

  const items = [
    { key: 'dates', icon: CalendarDays, label: t('public.overview.dates'), value: formatTournamentDateRange(tour.start_date, tour.end_date, lang) || '—' },
    { key: 'venue', icon: MapPin, label: t('public.overview.venue'), value: stadium?.name || tour.location || '—' },
    { key: 'teams', icon: Users, label: t('public.overview.teams'), value: `${tour.stats?.registered_teams ?? 0} / ${tour.teams_count ?? 0}` },
    { key: 'champions', icon: Trophy, label: t('public.overview.champions'), champion },
  ]

  return (
    <div className={`${CARD} px-4 py-6 sm:px-6`}>
      <div className="relative">
        <span aria-hidden="true" className="absolute end-[12%] start-[12%] top-6 hidden h-px bg-slate-200 sm:block" />
        <div className="relative grid grid-cols-2 justify-items-center gap-y-6 sm:grid-cols-4">
          {items.map((item) => (
            <InfoCell key={item.key} item={item} />
          ))}
        </div>
      </div>
    </div>
  )
}

function InfoPanel({ tour }) {
  const { t } = useTranslation()
  const stadium = tour.stadium
  const hasCoords = Boolean(stadium && typeof stadium.latitude === 'number' && typeof stadium.longitude === 'number')
  const mapSrc = hasCoords ? `https://maps.google.com/maps?q=${stadium.latitude},${stadium.longitude}&z=15&output=embed` : null
  const mapsUrl = stadium?.google_maps_url || (hasCoords ? `https://www.google.com/maps?q=${stadium.latitude},${stadium.longitude}` : null)

  const rows = [
    { icon: Layers, label: t('public.overview.groups'), value: tour.groups_count > 0 ? `${tour.groups_count}` : '—' },
    { icon: LayoutGrid, label: t('public.overview.format'), value: t(`committee.tournaments.formats.${tour.tournament_format}`) },
    {
      icon: Landmark,
      label: t('public.overview.venueCost'),
      value: stadium?.name ? (stadium.price != null ? `${stadium.price} ${t('public.overview.currency')}` : t('public.overview.free')) : '—',
    },
  ]

  return (
    <Collapsible icon={Info} title={t('public.overview.infoTitle')}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <dl className="grid content-center gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 rounded-2xl bg-slate-50/70 px-4 py-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm"><row.icon className="size-4" /></span>
              <div className="min-w-0">
                <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{row.label}</dt>
                <dd className="truncate text-sm font-extrabold text-slate-800" dir="auto">{row.value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <div className="relative h-56 overflow-hidden rounded-2xl bg-slate-100 lg:h-auto lg:min-h-[13rem]">
          {mapSrc ? (
            <iframe
              title={stadium.name}
              src={mapSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <div className="grid h-full place-items-center text-slate-300"><MapPin className="size-10" /></div>
          )}
          {stadium?.name && (
            <span className="absolute start-3 top-3 inline-flex max-w-[70%] items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-800 shadow backdrop-blur">
              <MapPin className="size-3.5 shrink-0 text-green-600" />
              <span className="truncate">{stadium.name}</span>
            </span>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-bold text-white shadow backdrop-blur transition-colors hover:bg-slate-900"
            >
              <MapPin className="size-3" />
              {t('public.overview.maps')}
            </a>
          )}
        </div>
      </div>
    </Collapsible>
  )
}

function KeyStats({ stats, standings, loading }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const leader = (standings?.groups?.[0]?.rows || []).find((r) => r.team)
  const scorer = stats?.top_scorers?.[0]
  const assister = stats?.top_assists?.[0]
  const keeper = stats?.best_goalkeeper
  const attack = stats?.best_attack
  const defense = stats?.best_defense

  const teamOf = (tId, tName, tLogo) => (tId != null ? { id: tId, name: tName, logo_url: tLogo } : null)

  const cards = [
    { key: 'bestTeam', label: t('public.overview.bestTeam'), icon: Trophy, tint: 'bg-amber-50 text-amber-600', target: leader?.team, main: leader?.team?.name, sub: leader ? t('public.overview.bestTeamSub', { wins: leader.wins, points: leader.points }) : null },
    { key: 'topScorer', label: t('public.overview.topScorer'), icon: Target, tint: 'bg-green-50 text-green-600', target: teamOf(scorer?.team_id, scorer?.team_name, scorer?.team_logo_url), main: scorer?.name, sub: scorer ? t('public.overview.topScorerSub', { count: scorer.count }) : null },
    { key: 'topAssister', label: t('public.overview.topAssister'), icon: Hand, tint: 'bg-sky-50 text-sky-600', target: teamOf(assister?.team_id, assister?.team_name, assister?.team_logo_url), main: assister?.name, sub: assister ? t('public.overview.topAssisterSub', { count: assister.count }) : null },
    { key: 'goalkeeper', label: t('public.overview.bestGoalkeeper'), icon: ShieldCheck, tint: 'bg-violet-50 text-violet-600', target: teamOf(keeper?.team_id, keeper?.team_name, keeper?.team_logo_url), main: keeper?.name, sub: keeper ? t('public.overview.bestGoalkeeperSub', { count: keeper.clean_sheets }) : null },
    { key: 'attack', label: t('public.overview.bestAttack'), icon: Flame, tint: 'bg-rose-50 text-rose-600', target: toTeam(attack), main: attack?.name, sub: attack ? t('public.overview.bestAttackSub', { count: attack.goals }) : null },
    { key: 'defense', label: t('public.overview.bestDefense'), icon: Shield, tint: 'bg-emerald-50 text-emerald-600', target: toTeam(defense), main: defense?.name, sub: defense ? t('public.overview.bestDefenseSub', { count: defense.goals_against }) : null },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-3xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.key} className={`${CARD} p-4`}>
          <span className={`grid size-9 place-items-center rounded-full ${card.tint}`}><card.icon className="size-4" /></span>
          <p className="mt-3 text-[11px] font-bold text-slate-400">{card.label}</p>
          {card.main ? (
            <button
              type="button"
              disabled={card.target?.id == null}
              onClick={() => card.target?.id != null && openTeam(card.target)}
              className="mt-0.5 block max-w-full truncate text-sm font-extrabold text-slate-900 hover:text-green-700 disabled:cursor-default disabled:hover:text-slate-900"
            >
              {card.main}
            </button>
          ) : (
            <p className="mt-0.5 text-sm font-extrabold text-slate-300">—</p>
          )}
          <p className="mt-1 text-[11px] font-semibold text-slate-400">{card.sub || '—'}</p>
        </div>
      ))}
    </div>
  )
}

function TeamBlock({ team, form, align, onOpen }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${align === 'end' ? 'flex-row-reverse' : ''}`}>
      <TeamAvatar team={team} className="size-11" />
      <div className="min-w-0">
        {team ? (
          <button
            type="button"
            onClick={() => team.id != null && onOpen(team)}
            className="block max-w-full truncate text-sm font-extrabold text-slate-900 hover:text-green-700"
          >
            {team.name}
          </button>
        ) : (
          <span className="text-sm font-extrabold text-slate-300">—</span>
        )}
        <FormBadges form={form} />
      </div>
    </div>
  )
}

function NextMatchCard({ fixture, standings, loading }) {
  const { t, i18n } = useTranslation()
  const { openTeam } = useProfileModal()

  if (loading) return <Skeleton className="h-64 rounded-3xl" />
  if (!fixture) {
    return (
      <div className={CARD}>
        <EmptyBlock icon={Swords} text={t('public.overview.noNextMatch')} />
      </div>
    )
  }

  const formMap = buildFormMap(standings)
  const when = fixture.scheduled_at ? `${matchDay(fixture.scheduled_at, i18n.language)} · ${formatTime(fixture.scheduled_at)}` : ''

  return (
    <Collapsible
      icon={Swords}
      title={t('public.overview.nextMatch')}
      trailing={
        fixture.round?.name ? (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{fixture.round.name}</span>
        ) : null
      }
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamBlock team={fixture.home_team} form={formMap[fixture.home_team?.id]} onOpen={openTeam} />
        <span className="px-1 text-sm font-black text-slate-300">VS</span>
        <TeamBlock team={fixture.away_team} form={formMap[fixture.away_team?.id]} align="end" onOpen={openTeam} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3.5 text-[11px] font-bold text-slate-500">
        {when && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-slate-400" />
            {when}
          </span>
        )}
        {fixture.stadium?.name && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-slate-400" />
            {fixture.stadium.name}
          </span>
        )}
        {fixture.group?.name && <span className="text-slate-400">{fixture.group.name}</span>}
      </div>
    </Collapsible>
  )
}

function ResultRow({ f, onOpen, i18n }) {
  const clickable = Boolean(onOpen) && Boolean(f.match?.id ?? f.match_id)
  const winner = f.match?.winner_team_id
  return (
    <button
      type="button"
      onClick={() => clickable && onOpen(f)}
      disabled={!clickable}
      className="flex w-full items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-start transition-colors hover:border-green-200 hover:bg-green-50/40"
    >
      <span className="w-14 shrink-0 text-center text-[10px] font-bold leading-tight text-slate-400">
        {f.scheduled_at ? matchDay(f.scheduled_at, i18n.language) : '—'}
        {f.scheduled_at ? <><br />{formatTime(f.scheduled_at)}</> : null}
      </span>
      <span className={`flex min-w-0 flex-1 items-center gap-2 ${winner === f.home_team?.id ? 'font-black text-slate-900' : 'font-bold text-slate-500'}`}>
        <TeamAvatar team={f.home_team} className="size-7" />
        <span className="truncate">{f.home_team?.name}</span>
      </span>
      <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-sm font-black tabular-nums text-slate-900 shadow-sm">
        {f.match?.home_score} - {f.match?.away_score}
      </span>
      <span className={`flex min-w-0 flex-1 items-center justify-end gap-2 ${winner === f.away_team?.id ? 'font-black text-slate-900' : 'font-bold text-slate-500'}`}>
        <span className="truncate">{f.away_team?.name}</span>
        <TeamAvatar team={f.away_team} className="size-7" />
      </span>
    </button>
  )
}

function RecentResults({ fixtures, loading, onOpen, onShowTab }) {
  const { t, i18n } = useTranslation()

  if (loading) return <Skeleton className="h-64 rounded-3xl" />

  const results = (fixtures || [])
    .filter((f) => f.home_team && f.away_team && f.match?.status === 'finished')
    .slice()
    .sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0))
    .slice(0, 3)

  return (
    <Collapsible icon={Flag} title={t('public.overview.recentResults')}>
      {results.length ? (
        <div className="space-y-2.5">
          {results.map((f) => <ResultRow key={f.id} f={f} onOpen={onOpen} i18n={i18n} />)}
        </div>
      ) : (
        <EmptyBlock icon={Flag} text={t('public.overview.noResults')} />
      )}
      <button
        type="button"
        onClick={() => onShowTab('results')}
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-green-700 transition-colors hover:text-green-800"
      >
        {t('public.overview.viewAllMatches')}
        <ArrowLeft className="size-3.5" />
      </button>
    </Collapsible>
  )
}

function StandingsMini({ standings, loading, onShowTab }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()

  if (loading) return <Skeleton className="h-64 rounded-3xl" />

  const rows = (standings?.groups?.[0]?.rows || []).filter((r) => r.team).slice(0, 3)

  return (
    <Collapsible icon={Trophy} title={t('public.overview.standings')}>
      {rows.length ? (
        <>
          <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 px-2 pb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <span>{t('public.overview.colRank')}</span>
            <span>{t('public.overview.colTeam')}</span>
            <span className="text-center">{t('public.overview.colPlayed')}</span>
            <span className="text-center">{t('public.overview.colPoints')}</span>
          </div>
          <div className="space-y-1.5">
            {rows.map((row, i) => (
              <div
                key={row.team_id}
                className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-2xl px-2 py-2 ${i === 0 ? 'bg-green-50/70 ring-1 ring-green-100' : 'bg-slate-50/60'}`}
              >
                <span className={`grid size-6 place-items-center rounded-full text-[10px] font-black ${i === 0 ? 'bg-green-600 text-white' : 'bg-white text-slate-500 shadow-sm'}`}>
                  {i + 1}
                </span>
                <button type="button" onClick={() => row.team?.id != null && openTeam(row.team)} className="flex min-w-0 items-center gap-2 text-start">
                  <TeamAvatar team={row.team} className="size-7" />
                  <span className="truncate text-xs font-extrabold text-slate-800">{row.team?.name}</span>
                </button>
                <span className="text-center text-xs font-semibold text-slate-500">{row.played}</span>
                <span className="text-center text-sm font-black tabular-nums text-slate-900">{row.points}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <EmptyBlock icon={Trophy} text={t('public.overview.noStandings')} />
      )}
      <button
        type="button"
        onClick={() => onShowTab('standings')}
        className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-green-700 transition-colors hover:text-green-800"
      >
        {t('public.overview.viewFullStandings')}
        <ArrowLeft className="size-3.5" />
      </button>
    </Collapsible>
  )
}

function RecordsCard({ stats, loading }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()

  if (loading) return <Skeleton className="h-64 rounded-3xl" />

  const records = stats?.records
  const mostGoals = records?.most_goals_in_match
  const biggestWin = records?.biggest_win
  const cleanSheets = records?.most_clean_sheets
  const streak = records?.most_consecutive_wins

  const tiles = [
    {
      key: 'goals',
      icon: Target,
      label: t('public.overview.recordMostGoals'),
      figure: mostGoals ? `${mostGoals.total} ${t('public.overview.goalsMatch')}` : null,
      team: mostGoals ? `${mostGoals.home_team?.name} ${mostGoals.home_score} - ${mostGoals.away_score} ${mostGoals.away_team?.name}` : null,
      target: toTeam(mostGoals?.home_team),
    },
    {
      key: 'win',
      icon: Flame,
      label: t('public.overview.recordBiggestWin'),
      figure: biggestWin ? `${biggestWin.home_score} - ${biggestWin.away_score}` : null,
      team: biggestWin ? (biggestWin.home_score > biggestWin.away_score ? biggestWin.home_team?.name : biggestWin.away_team?.name) : null,
      target: toTeam(biggestWin && biggestWin.home_score > biggestWin.away_score ? biggestWin.home_team : biggestWin?.away_team),
    },
    {
      key: 'cleanSheets',
      icon: ShieldCheck,
      label: t('public.overview.recordCleanSheets'),
      figure: cleanSheets?.count != null ? `${cleanSheets.count}` : null,
      team: cleanSheets?.team?.name,
      target: toTeam(cleanSheets?.team),
    },
    {
      key: 'streak',
      icon: Award,
      label: t('public.overview.recordStreak'),
      figure: streak?.count != null ? `${streak.count}` : null,
      team: streak?.team?.name,
      target: toTeam(streak?.team),
    },
  ]

  const hasAny = tiles.some((tile) => tile.figure != null)

  return (
    <Collapsible icon={Award} title={t('public.overview.records')}>
      {hasAny ? (
        <div className="grid grid-cols-2 gap-2.5">
          {tiles.map((tile) => (
            <div key={tile.key} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="grid size-7 place-items-center rounded-lg bg-white text-slate-400 shadow-sm"><tile.icon className="size-3.5" /></span>
              <p className="mt-2 text-[10px] font-bold text-slate-400">{tile.label}</p>
              <p className="mt-0.5 truncate text-sm font-black text-slate-900" dir="auto">{tile.figure}</p>
              {tile.team && (
                <button
                  type="button"
                  disabled={tile.target?.id == null}
                  onClick={() => tile.target?.id != null && openTeam(tile.target)}
                  className="mt-0.5 block max-w-full truncate text-[10px] font-semibold text-slate-500 hover:text-green-700 disabled:cursor-default disabled:hover:text-slate-500"
                >
                  {tile.team}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlock icon={Award} text={t('public.overview.noRecords')} />
      )}
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
    <div className="space-y-5">
      <QuickInfoStrip tour={tour} stats={stats} />
      <InfoPanel tour={tour} />
      <KeyStats stats={stats} standings={standings} loading={loading.stats} />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <NextMatchCard fixture={upcoming} standings={standings} loading={loading.fixtures} />
          <RecentResults fixtures={fixtures} loading={loading.fixtures} onOpen={onOpen} onShowTab={onShowTab} />
        </div>
        <div className="space-y-5">
          <StandingsMini standings={standings} loading={loading.standings} onShowTab={onShowTab} />
          <RecordsCard stats={stats} loading={loading.stats} />
        </div>
      </div>
    </div>
  )
}