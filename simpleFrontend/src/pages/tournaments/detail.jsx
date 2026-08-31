import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Flag, Images, LayoutGrid, Network, Newspaper, Swords, Target, Trophy, Users } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import useSeo from '../../hooks/useSeo'
import { Skeleton } from '../../components/dashboard/ui'
import { StandingsTable, BracketView } from './shared'
import TournamentStageBar from '../../components/tournaments/TournamentStageBar'
import Hero from './sections/Hero'
import RegistrationSection from './sections/RegistrationSection'
import OverviewSection from './sections/OverviewSection'
import TeamsSection from './sections/TeamsSection'
import FixturesSection from './sections/FixturesSection'
import ScorersSection from './sections/ScorersSection'
import NewsSection from './sections/NewsSection'
import GallerySection from './sections/GallerySection'
import SponsorsSection from './sections/SponsorsSection'
import PartnersSection from './sections/PartnersSection'
import ContactSection from './sections/ContactSection'
import MatchDetailModal from './components/MatchDetailModal'
import LiveMatchActivity from '../../components/LiveMatchActivity'

const SECTION_ICONS = {
  overview: LayoutGrid,
  teams: Users,
  matches: Swords,
  results: Flag,
  standings: Trophy,
  scorers: Target,
  bracket: Network,
  news: Newspaper,
  gallery: Images,
}

export default function PublicTournamentDetail() {
  const { t } = useTranslation()
  const { slug } = useParams()
  const [active, setActive] = useState('overview')
  const [openMatch, setOpenMatch] = useState(null)

  const detailQuery = useApi(() => api.get(`/v1/tournaments/${slug}`).then((r) => r.data.data), [slug], { staleTime: 0 })
  const tour = detailQuery.data

  const fixturesActive = ['overview', 'matches', 'results'].includes(active)
  const standingsActive = ['overview', 'teams', 'standings'].includes(active)
  const isKnockout = ['groups_knockout', 'knockout_only'].includes(tour?.tournament_format)
  const statsActive = active === 'scorers' || active === 'overview'
  const bracketActive = active === 'bracket' || (Boolean(tour) && isKnockout && active === 'overview')

  const fixturesQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/fixtures`).then((r) => r.data.data),
    [slug],
    { enabled: fixturesActive && Boolean(tour) },
  )
  const standingsQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/standings`).then((r) => r.data.data),
    [slug],
    { enabled: standingsActive && Boolean(tour) },
  )
  const teamsQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/teams`).then((r) => r.data.data),
    [slug],
    { enabled: active === 'teams' && Boolean(tour) },
  )
  const bracketQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/bracket`).then((r) => r.data.data),
    [slug],
    { enabled: bracketActive && Boolean(tour) },
  )
  const statsQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/statistics`).then((r) => r.data.data),
    [slug],
    { enabled: statsActive && Boolean(tour) },
  )
  const newsQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/news`).then((r) => r.data.data),
    [slug],
    { enabled: active === 'news' && Boolean(tour) },
  )
  const galleryQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/gallery`).then((r) => r.data.data),
    [slug],
    { enabled: active === 'gallery' && Boolean(tour) },
  )
  const sponsorsQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/sponsors`).then((r) => r.data.data),
    [slug],
    { enabled: fixturesActive && Boolean(tour) },
  )
  const partnersQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/partners`).then((r) => r.data.data),
    [slug],
    { enabled: fixturesActive && Boolean(tour) },
  )
  const contactQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/contact`).then((r) => r.data.data),
    [slug],
    { enabled: fixturesActive && Boolean(tour) },
  )

  const seoDescription = useMemo(() => {
    if (!tour) return ''
    return (
      tour.description ||
      [tour.location, `${tour.start_date || ''}${tour.end_date ? ` → ${tour.end_date}` : ''}`].filter(Boolean).join(' • ')
    )
  }, [tour])

  useSeo({
    title: tour ? `${tour.name} — ${t('public.tournaments.title')}` : t('public.tournaments.title'),
    description: seoDescription,
    image: tour?.cover_url || tour?.logo_url,
  })

  const sections = useMemo(() => {
    if (!tour) return []
    const fixturesCount = tour.stats?.fixtures ?? 0
    const finishedCount = tour.stats?.finished_matches ?? 0
    const hasKnockout = ['groups_knockout', 'knockout_only'].includes(tour.tournament_format)
    const hasStandings = ['groups_knockout', 'groups_only', 'league'].includes(tour.tournament_format)
    const visible = {
      overview: true,
      teams: true,
      matches: fixturesCount > finishedCount,
      results: finishedCount > 0,
      standings: hasStandings,
      scorers: finishedCount > 0,
      bracket: hasKnockout,
      news: true,
      gallery: true,
    }
    return Object.entries(SECTION_ICONS)
      .filter(([key]) => visible[key])
      .map(([key, icon]) => ({ key, icon, label: key === 'scorers' ? 'public.detail.statistics' : `public.detail.${key}` }))
  }, [tour])

  if (detailQuery.loading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 pb-24 sm:px-6 lg:px-8">
        <Skeleton className="h-[26rem] rounded-[2rem]" />
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-5">
            <Skeleton className="h-64 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
          <div className="space-y-5">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!tour) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 rounded-[2rem] border border-dashed border-slate-200 bg-white px-6 py-20 text-center">
        <span className="grid size-16 place-items-center rounded-3xl bg-slate-50 text-slate-300"><Trophy className="size-7" /></span>
        <div>
          <p className="text-base font-extrabold text-slate-900">{t('public.detail.notFound')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('public.tournamentPage.notFoundDesc')}</p>
        </div>
        <Link
          to="/tournaments"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
        >
          <ArrowRight className="size-4 rtl:rotate-180" />
          {t('public.detail.back')}
        </Link>
        </div>
      </div>
    )
  }

  const handleSection = (key) => {
    setActive(key)
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
      <Hero tour={tour} />

      <RegistrationSection tour={tour} />

      <nav aria-label={t('public.detail.ariaTabs')} className="sticky top-[106px] z-30 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div
          role="tablist"
          className="flex snap-x items-center gap-1 overflow-x-auto rounded-2xl bg-slate-950/95 p-1.5 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.65)] ring-1 ring-white/10 backdrop-blur-xl"
        >
          {sections.map(({ key, icon: Icon, label }) => {
            const isActive = active === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleSection(key)}
                className={`inline-flex shrink-0 snap-start items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-[0_10px_24px_-8px_rgba(16,185,129,0.7)]'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="size-3.5" />
                {t(label)}
              </button>
            )
          })}
        </div>
      </nav>

      <section id={`section-${active}`} className="scroll-mt-32">
        {active === 'overview' && (
          <>
            <OverviewSection
              tour={tour}
              fixtures={fixturesQuery.data}
              standings={standingsQuery.data}
              stats={statsQuery.data}
              loading={{ fixtures: fixturesQuery.loading, standings: standingsQuery.loading, stats: statsQuery.loading }}
              onOpen={setOpenMatch}
              onShowTab={handleSection}
            />
            <div className="mt-5 space-y-4">
              <LiveMatchActivity
                load={() => api.get(`/v1/tournaments/${slug}/live`).then((r) => r.data.data)}
                deps={[slug]}
                enabled={Boolean(tour)}
              />
              <SponsorsSection sponsors={sponsorsQuery.data} />
              <PartnersSection partners={partnersQuery.data} />
              <ContactSection contact={contactQuery.data} tournamentKey={slug} />
            </div>
          </>
        )}

        {active === 'teams' && <TeamsSection teams={teamsQuery.data} standings={standingsQuery.data} />}

        {active === 'matches' && (
          <>
            <div className="mb-5">
              <LiveMatchActivity
                load={() => api.get(`/v1/tournaments/${slug}/live`).then((r) => r.data.data)}
                deps={[slug]}
                enabled={Boolean(tour)}
              />
            </div>
            <FixturesSection fixtures={fixturesQuery.data} mode="upcoming" onOpen={setOpenMatch} />
          </>
        )}

        {active === 'results' && <FixturesSection fixtures={fixturesQuery.data} mode="finished" onOpen={setOpenMatch} />}

        {active === 'news' && <NewsSection news={newsQuery.data} tournamentKey={slug} />}

        {active === 'gallery' && <GallerySection gallery={galleryQuery.data} />}

        {active === 'standings' && (standingsQuery.data?.groups?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Trophy className="size-6" /></span>
            <p className="text-sm font-bold text-slate-600">{t('public.tournamentPage.noStandings')}</p>
          </div>
        ) : (
          active === 'standings' && <StandingsTable groups={standingsQuery.data?.groups || []} />
        )}

        {active === 'scorers' && <ScorersSection stats={statsQuery.data} />}

        {active === 'bracket' && (bracketQuery.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-300"><Network className="size-6" /></span>
            <p className="text-sm font-bold text-slate-600">{t('public.tournamentPage.noBracket')}</p>
          </div>
        ) : (
          active === 'bracket' && (
            <div className="space-y-5">
              <TournamentStageBar rounds={bracketQuery.data} />
              <BracketView rounds={bracketQuery.data} onOpen={setOpenMatch} />
            </div>
          )
        )}
      </section>

      <MatchDetailModal open={Boolean(openMatch)} onClose={() => setOpenMatch(null)} tournamentKey={slug} fixture={openMatch} />
    </div>
  )
}
