import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CalendarDays,
  ListOrdered,
  MapPin,
  Network,
  Settings2,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { Badge, SectionTitle, Skeleton, StatusBadge } from '../../components/dashboard/ui'
import { DrawGroups, FixturesList, StandingsTable, BracketView, StatisticsView } from './shared'
import TabsBar from '../../domains/tournaments/components/TabsBar'
import StatCard from '../../domains/tournaments/components/StatCard'

const tabs = [
  { key: 'overview', icon: Settings2, label: 'public.detail.overview' },
  { key: 'teams', icon: Users, label: 'public.detail.teams' },
  { key: 'fixtures', icon: Swords, label: 'public.detail.fixtures' },
  { key: 'standings', icon: Trophy, label: 'public.detail.standings' },
  { key: 'bracket', icon: Network, label: 'public.detail.bracket' },
  { key: 'statistics', icon: ListOrdered, label: 'public.detail.statistics' },
]

export default function PublicTournamentDetail() {
  const { t } = useTranslation()
  const { id } = useParams()
  const [active, setActive] = useState('overview')

  const { data: tour, loading } = useApi(
    () => api.get(`/v1/tournaments/${id}`).then((r) => r.data.data),
    [id],
    { staleTime: 0 },
  )

  const { data: teams } = useApi(
    () => api.get(`/v1/tournaments/${id}/teams`).then((r) => r.data.data),
    [id],
    { enabled: active === 'teams' },
  )

  const { data: fixtures } = useApi(
    () => api.get(`/v1/tournaments/${id}/fixtures`).then((r) => r.data.data),
    [id],
    { enabled: active === 'fixtures' },
  )

  const { data: standings } = useApi(
    () => api.get(`/v1/tournaments/${id}/standings`).then((r) => r.data.data),
    [id],
    { enabled: active === 'standings' },
  )

  const { data: bracket } = useApi(
    () => api.get(`/v1/tournaments/${id}/bracket`).then((r) => r.data.data),
    [id],
    { enabled: active === 'bracket' },
  )

  const { data: stats } = useApi(
    () => api.get(`/v1/tournaments/${id}/statistics`).then((r) => r.data.data),
    [id],
    { enabled: active === 'statistics' },
  )

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  if (!tour) {
    return (
      <SectionTitle
        title={t('public.detail.notFound')}
        action={
          <Link to="/tournaments" className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700">
            <ArrowRight className="size-4 rtl:rotate-180" />
            {t('public.detail.back')}
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <SectionTitle
        title={tour.name}
        subtitle={`${tour.edition || ''} ${tour.category || ''} • ${t(`committee.tournaments.formats.${tour.tournament_format}`)}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={tour.status} />
            {tour.status === 'finished' && tour.stats?.champion_team_id && (
              <Badge variant="warning">
                <Trophy className="me-1 inline size-3" />
                {t('public.detail.champion')}
              </Badge>
            )}
          </div>
        }
      />

      <TabsBar tabs={tabs} active={active} setActive={setActive} t={t} />

      {active === 'overview' && (
        <div className="space-y-5">
          {tour.description && (
            <p className="text-sm leading-relaxed text-slate-500">{tour.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 text-slate-400" />
              {tour.start_date}{tour.end_date ? ` → ${tour.end_date}` : ''}
            </span>
            {tour.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4 text-slate-400" />
                {tour.location}
              </span>
            )}
            {tour.organizer && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4 text-slate-400" />
                {t('public.tournaments.organizer')}: {tour.organizer.name}
              </span>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard value={tour.stats?.registered_teams ?? 0} label={t('committee.detail.stat.teams')} />
            <StatCard value={tour.stats?.groups ?? 0} label={t('committee.detail.stat.groups')} />
            <StatCard value={tour.stats?.fixtures ?? 0} label={t('committee.detail.stat.fixtures')} />
            <StatCard value={tour.stats?.finished_matches ?? 0} label={t('committee.detail.stat.finished')} />
          </div>
        </div>
      )}

      {active === 'teams' && (teams?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Users className="size-6" /></span>
          <p className="text-sm font-bold text-slate-600">{t('committee.detail.noTeams')}</p>
        </div>
      ) : active === 'teams' ? (
        <DrawGroups teams={teams} />
      ) : null}

      {active === 'fixtures' && <FixturesList fixtures={fixtures} />}

      {active === 'standings' && (standings?.groups?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Trophy className="size-6" /></span>
          <p className="text-sm font-bold text-slate-600">{t('committee.detail.noStandings')}</p>
        </div>
      ) : active === 'standings' ? (
        <StandingsTable groups={standings?.groups || []} />
      ) : null}

      {active === 'bracket' && (bracket?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Network className="size-6" /></span>
          <p className="text-sm font-bold text-slate-600">{t('committee.detail.noBracket')}</p>
        </div>
      ) : active === 'bracket' ? (
        <BracketView rounds={bracket} />
      ) : null}

      {active === 'statistics' && (
        stats ? <StatisticsView stats={stats} /> : (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><ListOrdered className="size-6" /></span>
            <p className="text-sm font-bold text-slate-600">{t('committee.detail.noStats')}</p>
          </div>
        )
      )}
    </div>
  )
}
