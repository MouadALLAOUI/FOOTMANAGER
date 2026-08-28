import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, MapPin, Trophy, Users } from 'lucide-react'
import { Skeleton } from '../../../components/dashboard/ui'
import { hideBrokenImage } from '../../../lib/imageErrors'
import { coverStyle, formatTournamentDateRange } from './shared'

const STATUS_DOT = {
  open_for_registration: 'bg-emerald-500',
  registration_closed: 'bg-amber-500',
  in_progress: 'bg-sky-500',
  completed: 'bg-slate-400',
  cancelled: 'bg-rose-500',
}

const STATUS_PILL = {
  open_for_registration: 'text-emerald-700 ring-emerald-300/60',
  registration_closed: 'text-amber-600 ring-amber-300/60',
  in_progress: 'text-sky-700 ring-sky-300/60',
  completed: 'text-slate-600 ring-slate-300/70',
  cancelled: 'text-rose-600 ring-rose-300/60',
}

export default function TournamentCard({ tour }) {
  const { t, i18n } = useTranslation()
  const dates = formatTournamentDateRange(tour.start_date, tour.end_date, i18n.language)
  const dot = STATUS_DOT[tour.status] || STATUS_DOT.completed
  const pill = STATUS_PILL[tour.status] || STATUS_PILL.completed

  return (
    <Link
      to={`/tournaments/${tour.slug || tour.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.16)] hover:ring-green-500/50"
    >
      <div className="relative h-32 shrink-0 overflow-hidden" style={tour.cover_url ? undefined : coverStyle(tour)}>
        {tour.cover_url && (
          <img
            src={tour.cover_url}
            alt=""
            loading="lazy"
            decoding="async"
            onError={hideBrokenImage}
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/10" />

        <span className={`absolute top-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-extrabold backdrop-blur ring-1 ${pill}`}>
          <span className={`size-1.5 rounded-full ${dot}`} />
          {t(`status.${tour.status}`)}
        </span>

        <span
          className="absolute -bottom-6 start-5 grid size-14 place-items-center overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-slate-200/80 shadow-[0_8px_20px_rgba(15,23,42,0.18)]"
        >
          {tour.logo_url ? (
            <img src={tour.logo_url} alt="" loading="lazy" onError={hideBrokenImage} className="size-full rounded-xl object-cover" />
          ) : (
            <span className="grid size-full place-items-center rounded-xl bg-gradient-to-br from-green-500 to-slate-900 text-white">
              <Trophy className="size-5" strokeWidth={2} />
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5 pt-8">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-extrabold text-slate-900">{tour.name}</h3>
          {tour.registration_open && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              {t('public.tournaments.spotsLeft', { count: tour.remaining_teams })}
            </span>
          )}
        </div>

        {tour.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{tour.description}</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-bold text-slate-500">
          {dates && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-slate-400" />
              {dates}
            </span>
          )}
          {tour.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-slate-400" />
              {tour.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5 text-slate-400" />
            {t('committee.tournaments.teamsCount', { count: tour.teams_count })}
          </span>
        </div>

        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            {t(`committee.tournaments.formats.${tour.tournament_format}`)}
          </span>
          {tour.organizer && (
            <span className="truncate text-[10px] font-semibold text-slate-400">
              {t('public.tournaments.organizer')}: {tour.organizer.name}
            </span>
          )}
          <span className="ms-auto inline-flex items-center gap-1 text-[11px] font-extrabold text-green-600 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
            {t('public.tournaments.viewDetails')}
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)]">
      <Skeleton className="relative h-32 rounded-none bg-slate-100/90" />
      <div className="flex-1 space-y-3 p-5 pt-8">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="space-y-2 pt-3">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <div className="pt-4">
          <Skeleton className="h-10 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}