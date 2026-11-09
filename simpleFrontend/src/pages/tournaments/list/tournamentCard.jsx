import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CalendarDays, MapPin, Trophy, Users } from 'lucide-react'
import { Skeleton } from '../../../components/dashboard/ui'
import { hideBrokenImage } from '../../../lib/imageErrors'
import { coverStyle, formatTournamentDateRange } from './shared'

const STATUS_BADGE = {
  in_progress: {
    labelKey: 'status.in_progress',
    fallback: 'جارية',
    cls: 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313]',
  },
  open_for_registration: {
    labelKey: 'status.open_for_registration',
    fallback: 'التسجيل مفتوح',
    cls: 'bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] border border-[#B8F000]/50 dark:border-[#D0FF38]/30',
  },
  registration_closed: {
    labelKey: 'status.registration_closed',
    fallback: 'قادمة',
    cls: 'bg-[#E9ECE7] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] border border-[#E1E5DF] dark:border-[#303832]',
  },
  completed: {
    labelKey: 'status.completed',
    fallback: 'منتهية',
    cls: 'bg-[#E9ECE7] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] border border-[#E1E5DF] dark:border-[#303832]',
  },
  cancelled: {
    labelKey: 'status.cancelled',
    fallback: 'ملغاة',
    cls: 'bg-[#D93636]/15 text-[#D93636] dark:text-[#FF6868]',
  },
}

export default function TournamentCard({ tour }) {
  const { t, i18n } = useTranslation()
  const dates = formatTournamentDateRange(tour.start_date, tour.end_date, i18n.language)
  const badge = STATUS_BADGE[tour.status] || STATUS_BADGE.completed
  const thumbImg = tour.logo_url || tour.cover_url

  return (
    <article className="h-full">
      <Link
        to={`/tournaments/${tour.slug || tour.id}`}
        className="group flex h-full items-center justify-between gap-3.5 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 sm:p-4 text-[#111313] dark:text-[#F5F7F2] shadow-2xs transition-all hover:border-[#B8F000] dark:hover:border-[#D0FF38]/60 active:scale-[0.99]"
      >
        {/* Right in RTL: Thumbnail / Trophy Visual */}
        <div
          className="relative size-18 sm:size-20 shrink-0 overflow-hidden rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#111313]"
          style={thumbImg ? undefined : coverStyle(tour)}
        >
          {thumbImg ? (
            <img
              src={thumbImg}
              alt={tour.name || ''}
              loading="lazy"
              decoding="async"
              onError={hideBrokenImage}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="grid size-full place-items-center bg-gradient-to-br from-[#1B201D] to-[#111313] text-[#B8F000]">
              <Trophy className="size-8 stroke-[2]" />
            </div>
          )}
        </div>

        {/* Center in RTL: Tournament Name + Metadata */}
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="truncate text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2] group-hover:text-[#16834A] dark:group-hover:text-[#D0FF38] transition-colors">
            {tour.name}
          </h3>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
            {tour.teams_count > 0 && (
              <span className="inline-flex items-center gap-1 text-[#111313] dark:text-[#F5F7F2]">
                <Users className="size-3.5 text-[#65706A] dark:text-[#B2B9B3]" />
                <span>{t('committee.tournaments.teamsCount', { count: tour.teams_count })}</span>
              </span>
            )}
            {tour.location && (
              <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{tour.location}</span>
              </span>
            )}
          </div>

          {dates && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
              <CalendarDays className="size-3 shrink-0" />
              <span className="truncate">{dates}</span>
            </div>
          )}
        </div>

        {/* Left in RTL: Status Pill */}
        <div className="shrink-0 flex flex-col items-end justify-center gap-1.5">
          <span
            className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-black whitespace-nowrap shadow-2xs ${badge.cls}`}
          >
            {t(badge.labelKey, badge.fallback)}
          </span>
          {tour.registration_open && tour.remaining_teams > 0 && (
            <span className="text-[10px] font-bold text-[#16834A] dark:text-[#42D889]">
              {t('public.tournaments.spotsLeft', { count: tour.remaining_teams })}
            </span>
          )}
        </div>
      </Link>
    </article>
  )
}

export function CardSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 sm:p-4 shadow-2xs">
      <Skeleton className="size-18 sm:size-20 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-14 shrink-0 rounded-full" />
    </div>
  )
}
