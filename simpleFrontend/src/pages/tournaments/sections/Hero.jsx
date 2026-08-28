import { useTranslation } from 'react-i18next'
import { CalendarDays, Flag, MapPin, Swords, Ticket, Trophy, Users } from 'lucide-react'
import { formatTournamentDateRange } from '../list/shared'

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

function StatCell({ icon: Icon, value, label }) {
  return (
    <div className="bg-white/[0.06] px-5 py-4">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-black tabular-nums leading-none">{value}</p>
    </div>
  )
}

export default function Hero({ tour }) {
  const { t, i18n } = useTranslation()
  const primary = tour.primary_color || '#16a34a'
  const secondary = tour.secondary_color || primary
  const hasCover = Boolean(tour.cover_url)
  const lang = i18n.language

  const registrationPill = tour.registration_open
    ? { cls: REGISTRATION_PILL.open, label: t('status.open_for_registration') }
    : tour.status === 'registration_closed'
      ? { cls: REGISTRATION_PILL.closed, label: t('status.registration_closed') }
      : null

  const venue = [tour.location, tour.stadium?.name].filter(Boolean).join(' • ')
  const dates = formatTournamentDateRange(tour.start_date, tour.end_date, lang)

  return (
    <section
      aria-label={tour.name}
      className="relative overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-[0_32px_80px_-32px_rgba(15,23,42,0.7)] ring-1 ring-white/10"
    >
      <div className="absolute inset-0">
        {hasCover && <img src={tour.cover_url} alt="" className="h-full w-full object-cover" loading="eager" />}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-slate-950/45" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {primary && (
          <div
            className="absolute inset-0 opacity-40 mix-blend-screen"
            style={{
              background: `radial-gradient(90% 130% at 12% -5%, ${primary}, transparent 60%), radial-gradient(80% 120% at 100% 100%, ${secondary}, transparent 55%)`,
            }}
          />
        )}
      </div>

      <div className="absolute inset-x-0 top-0 z-10 h-1" style={{ background: `linear-gradient(90deg, ${primary}, ${secondary})` }} />

      <div className="relative z-10 px-5 pb-8 pt-20 sm:px-8 sm:pb-10 sm:pt-24 lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ring-1 ${
              STATUS_PILL[tour.status] || 'bg-white/10 text-white/80 ring-white/20'
            }`}
          >
            {t(`status.${tour.status}`)}
          </span>
          {registrationPill && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black ${registrationPill.cls}`}>
              {registrationPill.label}
            </span>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-3xl flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div
                className="absolute -inset-4 rounded-[2rem] opacity-40 blur-2xl"
                style={{ background: `radial-gradient(60% 60% at 50% 50%, ${primary}, transparent 70%)` }}
              />
              <div
                className="relative grid size-24 place-items-center overflow-hidden rounded-[1.75rem] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/20 sm:size-28"
                style={{ backgroundImage: `linear-gradient(135deg, ${primary}22, ${secondary}55)` }}
              >
                {tour.logo_url ? (
                  <img src={tour.logo_url} alt="" className="size-full object-cover" />
                ) : (
                  <Trophy className="size-10 text-white/85" strokeWidth={1.5} />
                )}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-4xl font-black leading-[1.05] tracking-tight [text-shadow:0_2px_24px_rgba(15,23,42,0.45)] sm:text-5xl lg:text-6xl">
                {tour.name}
              </h1>
              <p className="mt-3 text-sm font-semibold text-white/70">
                {[tour.category, tour.edition].filter(Boolean).join(' • ')}
                {tour.organizer?.name ? `  •  ${t('public.tournamentPage.organizedBy')} ${tour.organizer.name}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
            {venue && <Chip icon={MapPin}>{venue}</Chip>}
            {dates && <Chip icon={CalendarDays}>{dates}</Chip>}
            <Chip icon={Users}>{t('public.tournamentPage.teamsCount', { count: tour.stats?.registered_teams ?? 0 })}</Chip>
            <Chip icon={Flag}>{t(`committee.tournaments.formats.${tour.tournament_format}`)}</Chip>
          </div>
        </div>

        <div className="mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/15 backdrop-blur-md sm:grid-cols-4 lg:grid-cols-4">
          <StatCell icon={Users} value={tour.stats?.registered_teams ?? 0} label={t('public.tournamentPage.teams')} />
          <StatCell icon={Ticket} value={tour.stats?.remaining_teams ?? 0} label={t('public.registration.slots')} />
          <StatCell icon={Swords} value={tour.stats?.fixtures ?? 0} label={t('public.detail.matches')} />
          <StatCell icon={Flag} value={tour.stats?.finished_matches ?? 0} label={t('public.tournamentPage.played')} />
        </div>
      </div>
    </section>
  )
}