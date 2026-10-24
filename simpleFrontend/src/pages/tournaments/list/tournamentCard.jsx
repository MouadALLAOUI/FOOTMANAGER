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
  open_for_registration: 'text-emerald-700 bg-emerald-50 ring-emerald-300/80',
  registration_closed: 'text-amber-700 bg-amber-50 ring-amber-300/80',
  in_progress: 'text-sky-700 bg-sky-50 ring-sky-300/80',
  completed: 'text-slate-700 bg-slate-100 ring-slate-300/80',
  cancelled: 'text-rose-700 bg-rose-50 ring-rose-300/80',
}

export default function TournamentCard({ tour }) {
  const { t, i18n } = useTranslation()
  const dates = formatTournamentDateRange(tour.start_date, tour.end_date, i18n.language)
  const dot = STATUS_DOT[tour.status] || STATUS_DOT.completed
  const pill = STATUS_PILL[tour.status] || STATUS_PILL.completed

  return (
    <article className="h-full">
      <Link
        to={`/tournaments/${tour.slug || tour.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(15,23,42,0.14)] hover:ring-green-500/50"
      >
        <div
          className="relative h-28 shrink-0 overflow-hidden sm:h-32"
          style={tour.cover_url ? undefined : coverStyle(tour)}
        >
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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20" />

          <span
            className={`absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold backdrop-blur-md ring-1 shadow-sm ${pill}`}
          >
            <span className={`size-1.5 rounded-full ${dot}`} />
            {t(`status.${tour.status}`, tour.status)}
          </span>

          <span className="absolute -bottom-5 start-4 grid size-12 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-[0_8px_20px_rgba(15,23,42,0.16)] ring-1 ring-slate-200/80 sm:size-14 sm:-bottom-6 sm:start-5">
            {tour.logo_url ? (
              <img
                src={tour.logo_url}
                alt=""
                loading="lazy"
                onError={hideBrokenImage}
                className="size-full rounded-xl object-cover"
              />
            ) : (
              <span className="grid size-full place-items-center rounded-xl bg-gradient-to-br from-green-500 to-slate-900 text-white">
                <Trophy className="size-5" strokeWidth={2} />
              </span>
            )}
          </span>
        </div>

        <div className="flex flex-1 flex-col p-4 pt-7 sm:p-5 sm:pt-8">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 text-[15px] font-black text-slate-900 transition-colors group-hover:text-green-600 sm:text-base">
              {tour.name}
            </h3>
            {tour.registration_open && (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-200">
                {t('public.tournaments.spotsLeft', { count: tour.remaining_teams })}
              </span>
            )}
          </div>

          {tour.description && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">
              {tour.description}
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px] font-bold text-slate-500 sm:gap-x-4">
            {dates && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-slate-400" />
                <span>{dates}</span>
              </span>
            )}
            {tour.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-slate-400" />
                <span>{tour.location}</span>
              </span>
            )}
            {tour.teams_count > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3.5 text-slate-400" />
                <span>{t('committee.tournaments.teamsCount', { count: tour.teams_count })}</span>
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">
                {t(`committee.tournaments.formats.${tour.tournament_format}`, tour.tournament_format)}
              </span>
              {tour.organizer?.name && (
                <span className="hidden max-w-[120px] truncate text-[10px] font-bold text-slate-400 sm:inline">
                  {tour.organizer.name}
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1 text-[11px] font-black text-green-600 transition-transform duration-300 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
              <span>{t('public.tournaments.viewDetails', 'تفاصيل البطولة')}</span>
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </span>
          </div>
        </div>
      </Link>
    </article>
  )
}

export function CardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-200/70 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.06)]">
      <Skeleton className="relative h-28 rounded-none bg-slate-100/90 sm:h-32" />
      <div className="flex-1 space-y-3 p-4 pt-7 sm:p-5 sm:pt-8">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="space-y-2 pt-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/5" />
        </div>
        <div className="pt-3">
          <Skeleton className="h-8 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
