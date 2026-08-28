import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, MapPin, Trophy } from 'lucide-react'
import { hideBrokenImage } from '../../../lib/imageErrors'
import { coverStyle, formatTournamentDateRange } from './shared'

export default function Upcoming({ tournaments }) {
  const { t, i18n } = useTranslation()
  if (!tournaments.length) return null

  return (
    <section aria-label={t('public.tournaments.upcoming.title')}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-900 md:text-2xl">
            {t('public.tournaments.upcoming.title')}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {t('public.tournaments.upcoming.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById('tournaments-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-green-600 transition-colors hover:text-green-700"
        >
          {t('public.tournaments.upcoming.viewAll')}
          <ArrowRight className="size-3.5 rtl:rotate-180" />
        </button>
      </div>

      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 no-scrollbar sm:mx-0 sm:px-0">
        {tournaments.map((tour) => {
          const dates = formatTournamentDateRange(tour.start_date, tour.end_date, i18n.language)
          return (
            <Link
              key={tour.id}
              to={`/tournaments/${tour.slug || tour.id}`}
              className="group w-[82%] shrink-0 snap-start overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-green-500/40 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)] sm:w-80"
            >
              <div className="relative flex h-20 items-center justify-between overflow-hidden px-4" style={tour.cover_url ? undefined : coverStyle(tour)}>
                {tour.cover_url && (
                  <img
                    src={tour.cover_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={hideBrokenImage}
                    className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-l from-slate-950/70 to-slate-950/20" />
                <div className="relative z-10 flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white p-0.5 ring-1 ring-white/30">
                    {tour.logo_url ? (
                      <img src={tour.logo_url} alt="" loading="lazy" onError={hideBrokenImage} className="size-full rounded-lg object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center rounded-lg bg-gradient-to-br from-green-500 to-slate-900 text-white">
                        <Trophy className="size-3.5" />
                      </span>
                    )}
                  </span>
                  <span className="max-w-44 truncate text-sm font-extrabold text-white drop-shadow">{tour.name}</span>
                </div>
                <span className="relative z-10 shrink-0 rounded-full bg-green-500 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-[0_6px_16px_rgba(22,163,74,0.45)]">
                  {t('public.tournaments.spotsLeft', { count: tour.remaining_teams })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3.5 text-[11px] font-bold text-slate-500">
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
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}