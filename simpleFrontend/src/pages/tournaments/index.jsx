import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Trophy, Users } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { Badge, SectionTitle, SkeletonCards } from '../../components/dashboard/ui'

export default function TournamentsIndex() {
  const { t } = useTranslation()
  const { data, loading } = useApi(() => api.get('/v1/tournaments', { params: { per_page: 24 } }).then((r) => r.data))
  const tournaments = data?.data || []

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
      <SectionTitle title={t('public.tournaments.title')} subtitle={t('public.tournaments.subtitle')} />

      {loading ? (
        <SkeletonCards count={6} />
      ) : tournaments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-green-50 text-green-500">
            <Trophy className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">{t('public.tournaments.empty')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('public.tournaments.emptyDesc')}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((tour) => (
            <Link
              key={tour.id}
              to={`/tournaments/${tour.id}`}
              className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-green-50 text-green-500">
                  <Trophy className="size-5" strokeWidth={2} />
                </span>
                <Badge variant={tour.status === 'finished' ? 'neutral' : 'success'}>
                  {t(`status.${tour.status}`)}
                </Badge>
              </div>
              <h3 className="mt-3 text-sm font-extrabold text-slate-900">{tour.name}</h3>
              {tour.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{tour.description}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-slate-400" />
                  {tour.start_date}{tour.end_date ? ` → ${tour.end_date}` : ''}
                </span>
                {tour.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-slate-400" />
                    {tour.location}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  <Users className="me-1 inline size-3" />
                  {t('committee.tournaments.teamsCount', { count: tour.teams_count })}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                  {t(`committee.tournaments.formats.${tour.tournament_format}`)}
                </span>
              </div>
              {tour.organizer && (
                <p className="mt-3 border-t border-slate-50 pt-2.5 text-[10px] font-semibold text-slate-400">
                  {t('public.tournaments.organizer')}: {tour.organizer.name}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
