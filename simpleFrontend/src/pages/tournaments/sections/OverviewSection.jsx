import { useTranslation } from 'react-i18next'
import { CalendarDays, Crown, MapPin, ScrollText, Swords, Trophy, Users } from 'lucide-react'
import { TeamAvatar } from '../shared'
import { formatTime, matchDay } from '../../../lib/adapters'

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

function Fact({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-400">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  )
}

function NextMatchCard({ fixture, t, lang }) {
  const f = fixture
  const played = f.match?.status === 'finished'
  return (
    <div className="rounded-3xl border border-green-200/70 bg-gradient-to-l from-green-50/70 to-white p-5">
      <p className="mb-4 flex items-center gap-2 text-xs font-black text-green-700">
        <span className="grid size-7 place-items-center rounded-lg bg-green-500 text-white"><Swords className="size-3.5" /></span>
        {t('public.tournamentPage.nextMatch')}
        {f.round?.name && <span className="ms-auto text-[10px] font-bold text-slate-400">{f.round.name}</span>}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamAvatar team={f.home_team} className="size-10" />
          <span className="truncate text-sm font-extrabold text-slate-900">{f.home_team?.name || '—'}</span>
        </div>
        <div className="flex flex-col items-center px-1">
          <span className="text-base font-black text-slate-900">
            {played ? `${f.match.home_score} - ${f.match.away_score}` : 'VS'}
          </span>
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400">
            {f.scheduled_at && <CalendarDays className="size-3" />}
            {f.scheduled_at ? `${matchDay(f.scheduled_at, lang)} ${formatTime(f.scheduled_at)}` : ''}
          </span>
          {f.stadium?.name && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
              <MapPin className="size-3" />
              {f.stadium.name}
            </span>
          )}
        </div>
        <div className="flex min-w-0 items-center justify-end gap-2.5">
          <span className="truncate text-sm font-extrabold text-slate-900">{f.away_team?.name || '—'}</span>
          <TeamAvatar team={f.away_team} className="size-10" />
        </div>
      </div>
    </div>
  )
}

function LatestResults({ fixtures, t }) {
  const results = (fixtures || [])
    .filter((f) => f.match?.status === 'finished')
    .slice()
    .sort((a, b) => new Date(b.scheduled_at || 0) - new Date(a.scheduled_at || 0))
    .slice(0, 4)

  if (results.length === 0) return null

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
      <p className="mb-4 flex items-center gap-2 text-xs font-black text-slate-700">
        <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-500"><Trophy className="size-3.5" /></span>
        {t('public.tournamentPage.latestResults')}
      </p>
      <div className="space-y-2">
        {results.map((f) => (
          <div key={f.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TeamAvatar team={f.home_team} className="size-6" />
              <span className="truncate text-xs font-bold text-slate-700">{f.home_team?.name || '—'}</span>
            </div>
            <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-900 ring-1 ring-slate-200">
              {f.match.home_score} - {f.match.away_score}
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              <span className="truncate text-xs font-bold text-slate-700">{f.away_team?.name || '—'}</span>
              <TeamAvatar team={f.away_team} className="size-6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CurrentLeader({ standings, t }) {
  const groups = standings?.groups || []
  const rows = (groups[0]?.rows || []).filter((r) => r.team)
  const leader = rows[0]
  if (!leader) return null

  return (
    <div className="rounded-3xl border border-amber-200/70 bg-gradient-to-l from-amber-50/70 to-white p-5">
      <p className="mb-4 flex items-center gap-2 text-xs font-black text-amber-700">
        <span className="grid size-7 place-items-center rounded-lg bg-amber-500 text-white"><Crown className="size-3.5" /></span>
        {t('public.tournamentPage.currentLeader')}
        {groups[0]?.name && <span className="ms-auto text-[10px] font-bold text-slate-400">{groups[0].name}</span>}
      </p>
      <div className="flex items-center gap-3">
        <TeamAvatar team={leader.team} className="size-12 ring-2 ring-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-slate-900">{leader.team.name}</p>
          <p className="text-[11px] font-bold text-slate-400">
            {t('public.tournamentPage.leaderLine', { played: leader.played, wins: leader.wins, draws: leader.draws, losses: leader.losses })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-black text-amber-600">{leader.points}</p>
          <p className="text-[10px] font-bold text-slate-400">{t('public.tournamentPage.points')}</p>
        </div>
      </div>
    </div>
  )
}

export default function OverviewSection({ tour, fixtures, standings }) {
  const { t, i18n } = useTranslation()

  const upcoming = (fixtures || []).find((f) => !['finished', 'cancelled', 'postponed'].includes(f.match?.status) && f.home_team && f.away_team)
  const stage = currentStage(tour, fixtures, t)

  return (
    <div className="space-y-5">
      {tour.description && (
        <p className="text-sm leading-relaxed text-slate-600">{tour.description}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Fact icon={CalendarDays} label={t('public.tournamentPage.dates')} value={`${tour.start_date}${tour.end_date ? ` → ${tour.end_date}` : ''}`} />
        <Fact icon={MapPin} label={t('public.tournamentPage.location')} value={tour.location} />
        <Fact icon={Trophy} label={t('public.tournamentPage.stage')} value={stage} />
        <Fact icon={Users} label={t('public.tournamentPage.teams')} value={`${tour.stats?.registered_teams ?? 0} / ${tour.teams_count ?? 0}`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          {upcoming && <NextMatchCard fixture={upcoming} t={t} lang={i18n.language} />}
          {tour.rules && (
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-black text-slate-700">
                <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-500"><ScrollText className="size-3.5" /></span>
                {t('public.detail.rules')}
              </p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">{tour.rules}</p>
            </div>
          )}
        </div>
        <div className="space-y-5">
          <LatestResults fixtures={fixtures} t={t} />
          <CurrentLeader standings={standings} t={t} />
        </div>
      </div>
    </div>
  )
}
