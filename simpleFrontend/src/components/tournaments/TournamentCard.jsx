import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Trophy, Users, Shield, ArrowUpRight } from 'lucide-react'
import { hideBrokenImage } from '../../lib/imageErrors'

const REGISTRATION_STYLES = {
  open: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  upcoming: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
  closed: 'bg-slate-700/50 text-slate-300 border border-slate-600/30',
  in_progress: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  finished: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
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
    backgroundImage: `linear-gradient(135deg, ${tour.primary_color || '#059669'} 0%, ${tour.secondary_color || '#0B1120'} 100%)`,
  }

  return (
    <article
      className={`group flex h-full w-[85%] sm:w-auto max-w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl transition-all duration-300 ease-out hover:-translate-y-1.5 shadow-xl border bg-[#0E1726] border-slate-800/90 text-white shadow-black/40 hover:border-emerald-500/40 hover:shadow-emerald-950/40 dark:bg-[#0E1726] dark:border-slate-800 ${className}`}
    >
      {/* Tournament Cover Header */}
      <div className="relative h-[160px] overflow-hidden">
        {tour.cover_url ? (
          <img
            src={tour.cover_url}
            alt={tour.name}
            loading="lazy"
            decoding="async"
            onError={hideBrokenImage}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          />
        ) : (
          <div style={bannerStyle} className="absolute inset-0 opacity-90" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0E1726] via-[#0E1726]/40 to-transparent" />

        {/* Status Badges */}
        <span
          className={`absolute top-3 start-3 rounded-full px-3 py-1 text-[11px] font-black shadow-md backdrop-blur-md ${REGISTRATION_STYLES[state]}`}
        >
          {t(`landing.tournaments.registration.${state}`, 'تسجيل مفتوح')}
        </span>

        <span className="absolute bottom-3 end-3 flex items-center gap-1.5 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-black text-emerald-400 border border-slate-700/60 backdrop-blur-md">
          <Trophy className="size-3 text-amber-400" />
          <span>{t(`status.${tour.status}`, 'نشطة')}</span>
        </span>

        {/* Logo Avatar */}
        {tour.logo_url ? (
          <img
            src={tour.logo_url}
            alt={tour.name}
            loading="lazy"
            onError={hideBrokenImage}
            className="absolute -bottom-4 start-4 size-13 rounded-2xl object-cover shadow-lg ring-2 ring-emerald-500/50 bg-[#0E1726]"
          />
        ) : (
          <span className="absolute -bottom-4 start-4 grid size-13 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-lg ring-2 ring-emerald-500/40">
            <Trophy className="size-6 text-white" />
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4 pt-6">
        <h3 className="bidi-plaintext line-clamp-1 text-sm sm:text-base font-black leading-snug text-white group-hover:text-emerald-400 transition-colors">
          {tour.name}
        </h3>

        {tour.description && (
          <p className="bidi-plaintext mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {tour.description}
          </p>
        )}

        {/* Logistics & Metrics with Real DB Data */}
        <div className="mt-3 space-y-1.5 text-xs font-bold text-slate-300 border-t border-slate-800/80 pt-2.5">
          <p className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
            <Calendar className="size-3.5 shrink-0 text-emerald-400" />
            <span>{tour.start_date}</span>
            {tour.end_date && <span>← {tour.end_date}</span>}
          </p>

          {tour.location && (
            <p className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
              <MapPin className="size-3.5 shrink-0 text-emerald-400" />
              <span className="bidi-plaintext min-w-0 truncate">{tour.location}</span>
            </p>
          )}

          <p className="flex items-center gap-2 text-[11px] text-slate-300">
            <Users className="size-3.5 shrink-0 text-emerald-400" />
            <span>
              {tour.teams_count
                ? `${registered} من أصل ${tour.teams_count} فرق مشاركة`
                : `${registered} فرق مشاركة`}
            </span>
          </p>
        </div>

        {/* Format & Entry Badges */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-xl bg-slate-800/80 px-2 py-0.5 text-[10px] font-black text-slate-300 border border-slate-700/60">
            {t(`committee.tournaments.formats.${tour.tournament_format}`, tour.tournament_format || 'دوري مجموعات')}
          </span>

          <span className="rounded-xl bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300 border border-emerald-500/30">
            {tour.requires_registration_fee && tour.registration_fee > 0
              ? `${tour.registration_fee} درهم`
              : 'مشاركة مجانية'}
          </span>
        </div>

        {tour.organizer && (
          <p className="mt-2 text-[10px] font-bold text-slate-400 truncate">
            المنظم: <span className="text-slate-200">{tour.organizer.name}</span>
          </p>
        )}

        <div className="flex-1 min-h-2" />

        {/* Action Link */}
        <Link
          to={`/tournaments/${tour.slug || tour.id}`}
          className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-xs font-black text-white shadow-md shadow-emerald-600/30 transition-all active:scale-95"
        >
          <Trophy className="size-3.5" />
          <span>تفاصيل البطولة والنتائج</span>
          <ArrowUpRight className="size-3.5 opacity-80" />
        </Link>
      </div>
    </article>
  )
}
