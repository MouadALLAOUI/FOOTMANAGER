import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarDays, faMapPin, faTrophy, faUsers } from '@fortawesome/free-solid-svg-icons'
import { hideBrokenImage } from '../../lib/imageErrors'

const REGISTRATION_STYLES = {
  open: 'bg-green-100 text-green-700',
  upcoming: 'bg-blue-100 text-blue-700',
  closed: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-orange-100 text-orange-700',
  finished: 'bg-violet-100 text-violet-700',
}

function registrationState(tour) {
  if (tour.status === 'open_for_registration') return tour.registration_open ? 'open' : 'upcoming'
  if (tour.status === 'in_progress') return 'in_progress'
  if (tour.status === 'completed') return 'finished'
  return 'closed'
}

export default function TournamentCard({ tournament: tour, className = '' }) {
  const { t } = useTranslation()

  const state = registrationState(tour)
  const registered = Math.max(0, (tour.teams_count || 0) - (tour.remaining_teams || 0))
  const bannerStyle = {
    backgroundImage: `linear-gradient(135deg, ${tour.primary_color || '#059669'} 0%, ${tour.secondary_color || '#022c22'} 100%)`,
  }

  return (
    <article
      className={`group flex h-full w-[82%] max-w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(17,24,39,0.18)] ${className}`}
    >
      <div className="relative h-[170px] overflow-hidden">
        {tour.cover_url ? (
          <img
            src={tour.cover_url}
            alt={tour.name}
            loading="lazy"
            decoding="async"
            onError={hideBrokenImage}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div style={bannerStyle} className="absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

        <span
          className={`absolute top-3 start-3 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm ${REGISTRATION_STYLES[state]}`}
        >
          {t(`landing.tournaments.registration.${state}`)}
        </span>

        <span className="absolute bottom-3 end-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
          <FontAwesomeIcon icon={faTrophy} className="size-3" />
          {t(`status.${tour.status}`)}
        </span>

        {tour.logo_url ? (
          <img
            src={tour.logo_url}
            alt={tour.name}
            loading="lazy"
            onError={hideBrokenImage}
            className="absolute -bottom-5 start-5 size-14 rounded-2xl object-cover shadow-md ring-4 ring-white"
          />
        ) : (
          <span className="absolute -bottom-5 start-5 grid size-14 place-items-center rounded-2xl bg-green-600 text-white shadow-md ring-4 ring-white">
            <FontAwesomeIcon icon={faTrophy} className="size-6" />
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5 pt-7">
        <h3 className="bidi-plaintext line-clamp-2 text-base font-extrabold leading-snug text-slate-900">{tour.name}</h3>
        {tour.description && (
          <p className="bidi-plaintext mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{tour.description}</p>
        )}

        <div className="mt-3 space-y-1.5 text-xs font-semibold text-slate-600">
          <p className="flex items-center gap-2">
            <FontAwesomeIcon icon={faCalendarDays} className="size-3.5 shrink-0 text-slate-400" />
            {tour.start_date}
            {tour.end_date ? ` → ${tour.end_date}` : ''}
          </p>
          {tour.location && (
            <p className="flex items-center gap-2">
              <FontAwesomeIcon icon={faMapPin} className="size-3.5 shrink-0 text-slate-400" />
              <span className="bidi-plaintext min-w-0 truncate">{tour.location}</span>
            </p>
          )}
          <p className="flex items-center gap-2">
            <FontAwesomeIcon icon={faUsers} className="size-3.5 shrink-0 text-slate-400" />
            {tour.teams_count
              ? t('landing.tournaments.teamsFull', { registered, max: tour.teams_count })
              : t('landing.tournaments.teams', { count: registered })}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            {t(`committee.tournaments.formats.${tour.tournament_format}`)}
          </span>
          {tour.requires_registration_fee ? (
            <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
              {tour.registration_fee} {t('fieldsPage.card.currency')}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              {t('landing.tournaments.free')}
            </span>
          )}
        </div>

        {tour.organizer && (
          <p className="mt-3 text-[10px] font-semibold text-slate-400">
            {t('public.tournaments.organizer')}: <span className="bidi-plaintext">{tour.organizer.name}</span>
          </p>
        )}

        <div className="flex-1" />

        <Link
          to={`/tournaments/${tour.slug || tour.id}`}
          className="mt-4 flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-green-500 text-sm font-bold text-white shadow-md shadow-green-500/25 transition-colors duration-300 ease-out hover:bg-green-700 active:scale-[0.98]"
        >
          <FontAwesomeIcon icon={faTrophy} className="size-4" />
          {t('landing.tournaments.view')}
        </Link>
      </div>
    </article>
  )
}
