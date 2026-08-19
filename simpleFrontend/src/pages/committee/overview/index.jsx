import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Trophy, Users } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { useAuth } from '../../../context/AuthContext'
import { Card, Skeleton, Stat } from '../../../components/dashboard/ui'

export default function Overview() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const { data, loading } = useApi(() => api.get('/committee/tournaments', { params: { per_page: 50 } }).then((r) => r.data))
  const tournaments = data?.data || []
  const totalTeams = tournaments.reduce((sum, tour) => sum + (tour.teams_count || 0), 0)
  const published = tournaments.filter((tour) => !['draft', 'cancelled'].includes(tour.status)).length
  const drafts = tournaments.length - published

  return (
    <div>
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-l from-[#0b1220] via-[#0f1a2e] to-[#12321f] p-7 text-white shadow-[0_18px_40px_rgba(15,23,42,0.25)] lg:p-8">
        <div className="pointer-events-none absolute -end-16 -top-16 size-64 rounded-full bg-green-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 start-1/4 size-64 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 text-2xl font-black text-white shadow-[0_10px_24px_rgba(34,197,94,0.4)]">
              {(user?.name || '؟').slice(0, 1)}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-green-400">{t('nav.committee.brand')}</p>
              <h2 className="mt-0.5 truncate text-xl font-black sm:text-2xl">{user?.name}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white/50">
                <Trophy className="size-3.5" />
                {t('committee.overview.subtitle')}
              </p>
            </div>
          </div>
          <Link
            to="/committee/tournaments?new=1"
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-green-500 px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(34,197,94,0.35)] transition-all hover:bg-green-600"
          >
            <Trophy className="size-4" />
            {t('nav.committee.createTournament')}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Trophy} label={t('committee.overview.stat.tournaments')} value={loading ? 0 : tournaments.length} />
        <Stat icon={Users} label={t('committee.overview.stat.teams')} value={totalTeams} accent="sky" />
        <Stat icon={CalendarDays} label={t('committee.overview.stat.published')} value={published} accent="violet" />
        <Stat icon={CalendarDays} label={t('committee.overview.stat.drafts')} value={drafts} accent="amber" />
      </div>

      <div className="mt-6">
        <Card
          title={t('committee.overview.recentTitle')}
          subtitle={t('committee.overview.recentDesc')}
          action={
            <Link to="/committee/tournaments" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-green-50 px-3.5 text-xs font-bold text-green-700 transition-colors hover:bg-green-100">
              {t('committee.overview.viewAll')}
              <ArrowRight className="size-3.5 rtl:rotate-180" />
            </Link>
          }
        >
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 p-12 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-white text-slate-300"><Trophy className="size-6" /></span>
              <p className="mt-4 text-sm font-bold text-slate-700">{t('committee.overview.emptyTitle')}</p>
              <p className="mt-1 text-xs text-slate-400">{t('committee.overview.emptyDesc')}</p>
              <Link
                to="/committee/tournaments?new=1"
                className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-green-500 px-4 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(34,197,94,0.3)] transition-all hover:bg-green-600"
              >
                <Trophy className="size-3.5" />
                {t('nav.committee.createTournament')}
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {tournaments.slice(0, 6).map((tour) => (
                <Link
                  key={tour.id}
                  to={`/committee/tournaments/${tour.id}`}
                  className="rounded-2xl border border-slate-200/70 bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-extrabold text-slate-900">{tour.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tour.status === 'draft' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                      {t(`status.${tour.status}`)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-400">
                    {t(`committee.tournaments.formats.${tour.tournament_format}`)} • {t('committee.tournaments.teamsCount', { count: tour.teams_count })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
