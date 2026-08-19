import { useTranslation } from 'react-i18next'
import { CalendarDays, MapPin, Trophy, Users } from 'lucide-react'

const STATUS_PILL = {
  open_for_registration: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
  registration_closed: 'bg-amber-400/15 text-amber-300 ring-amber-400/30',
  in_progress: 'bg-sky-400/15 text-sky-300 ring-sky-400/30',
  completed: 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
  cancelled: 'bg-slate-400/15 text-slate-300 ring-slate-400/30',
}

const REGISTRATION_PILL = {
  open: 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.45)]',
  closed: 'bg-amber-500 text-white shadow-[0_8px_24px_rgba(245,158,11,0.45)]',
}

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
      <Icon className="size-3.5 text-white/60" />
      {children}
    </span>
  )
}

export default function Hero({ tour }) {
  const { t } = useTranslation()
  const primary = tour.primary_color || '#16a34a'
  const secondary = tour.secondary_color || primary
  const hasCover = Boolean(tour.cover_url)

  const registrationPill = tour.registration_open
    ? { cls: REGISTRATION_PILL.open, label: t('status.open_for_registration') }
    : tour.status === 'registration_closed'
      ? { cls: REGISTRATION_PILL.closed, label: t('status.registration_closed') }
      : null

  return (
    <section className="relative overflow-hidden rounded-[2rem] text-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.55)]">
      <div className="absolute inset-0">
        {hasCover && <img src={tour.cover_url} alt="" className="h-full w-full object-cover" loading="eager" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/45" />
        {primary && (
          <div
            className="absolute inset-0 opacity-30 mix-blend-overlay"
            style={{ background: `radial-gradient(90% 140% at 90% -10%, ${primary}, transparent 60%)` }}
          />
        )}
      </div>
      <div className="absolute inset-x-0 top-0 z-10 h-1.5" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />

      <div className="relative z-10 px-6 pb-12 pt-24 sm:px-10 sm:pb-16 sm:pt-28">
        <div className="flex flex-col gap-9 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md sm:size-28">
              {tour.logo_url ? (
                <img src={tour.logo_url} alt={tour.name} className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center bg-gradient-to-br from-white/20 to-transparent">
                  <Trophy className="size-10 text-white/80" strokeWidth={1.6} />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ring-1 ${STATUS_PILL[tour.status] || 'bg-white/10 text-white/80 ring-white/20'}`}>
                  {t(`status.${tour.status}`)}
                </span>
                {registrationPill && (
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ${registrationPill.cls}`}>
                    {registrationPill.label}
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight sm:text-5xl">{tour.name}</h1>
              <p className="mt-2 text-sm font-semibold text-white/70">
                {[tour.edition, tour.category].filter(Boolean).join(' • ')}
                {tour.organizer?.name ? ` • ${t('public.tournamentPage.organizedBy')} ${tour.organizer.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            {tour.location && (
              <Chip icon={MapPin}>{tour.location}</Chip>
            )}
            <Chip icon={CalendarDays}>
              {tour.start_date}{tour.end_date ? ` → ${tour.end_date}` : ''}
            </Chip>
            <Chip icon={Users}>{t('public.tournamentPage.teamsCount', { count: tour.stats?.registered_teams ?? 0 })}</Chip>
            <Chip icon={Trophy}>{t(`committee.tournaments.formats.${tour.tournament_format}`)}</Chip>
          </div>
        </div>
      </div>
    </section>
  )
}
