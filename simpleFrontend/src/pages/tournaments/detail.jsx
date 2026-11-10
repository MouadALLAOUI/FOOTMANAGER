import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Images,
  Info,
  Network,
  Newspaper,
  Radio,
  Target,
  Trophy,
  Users,
} from 'lucide-react'
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

const PRIMARY_TABS = [
  { key: 'overview', icon: Info, label: 'معلومات' },
  { key: 'teams', icon: Users, label: 'المجموعات' },
  { key: 'matches', icon: Calendar, label: 'المباريات' },
  { key: 'standings', icon: BarChart3, label: 'الترتيب' },
]

const SECONDARY_SECTION_ICONS = {
  bracket: Network,
  scorers: Target,
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

  useSeo({
    title: tour?.name ? `${tour.name} — بطولة كرة قدم` : 'تفاصيل البطولة',
    description: tour?.description || 'تابع جدول المباريات وترتيب الفرق ونتائج البطولة على منصة أجي نقصرو.',
    canonical: `https://ajin9essro.com/tournaments/${slug ? decodeURIComponent(slug) : ''}`,
    image: tour?.cover_image_url,
  })

  const fixturesActive = ['overview', 'matches', 'results'].includes(active)
  const standingsActive = ['overview', 'teams', 'standings'].includes(active)
  const isKnockout = ['groups_knockout', 'knockout_only'].includes(tour?.tournament_format)
  const statsActive = active === 'scorers' || active === 'overview'
  const bracketActive = active === 'bracket' || (Boolean(tour) && isKnockout && active === 'overview')

  const fixturesQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/fixtures`).then((r) => r.data.data),
    [slug],
    { enabled: fixturesActive && Boolean(tour), staleTime: 0 },
  )
  const standingsQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/standings`).then((r) => r.data.data),
    [slug],
    { enabled: standingsActive && Boolean(tour), staleTime: 0 },
  )
  const teamsQuery = useApi(
    () => api.get(`/v1/tournaments/${slug}/teams`).then((r) => r.data.data),
    [slug],
    { enabled: active === 'teams' && Boolean(tour), staleTime: 0 },
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

  const secondarySections = useMemo(() => {
    if (!tour) return []
    const finishedCount = tour.stats?.finished_matches ?? 0
    const hasKnockout = ['groups_knockout', 'knockout_only'].includes(tour.tournament_format)
    const visible = {
      bracket: hasKnockout,
      scorers: finishedCount > 0,
      news: true,
      gallery: true,
    }
    return Object.entries(SECONDARY_SECTION_ICONS)
      .filter(([key]) => visible[key])
      .map(([key, icon]) => ({
        key,
        icon,
        label: key === 'scorers' ? 'public.detail.statistics' : `public.detail.${key}`,
      }))
  }, [tour])

  if (detailQuery.loading) {
    return (
      <div className="mx-auto w-full max-w-[1400px] space-y-5 px-3 sm:px-6 lg:px-8 pb-24">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  if (!tour) {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-24 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-6 py-20 text-center">
          <span className="grid size-16 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]">
            <Trophy className="size-7" />
          </span>
          <div>
            <p className="text-base font-extrabold text-[#111313] dark:text-[#F5F7F2]">{t('public.detail.notFound')}</p>
            <p className="mt-1 text-xs text-[#65706A] dark:text-[#B2B9B3]">{t('public.tournamentPage.notFoundDesc')}</p>
          </div>
          <Link
            to="/tournaments"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#111313] dark:bg-[#D0FF38] px-5 text-sm font-black text-white dark:text-[#111313] transition-opacity hover:opacity-90"
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

  const handleLiveMatchesJump = () => {
    const liveEl = typeof document !== 'undefined' ? document.getElementById('live-matches-section') : null
    if (liveEl) {
      liveEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setActive('matches')
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 px-3 sm:px-6 lg:px-8 pb-24 lg:pb-32">
      {/* Unified Hero Header + 4-Segment Primary Navigation Bar */}
      <div className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs">
        <Hero tour={tour} embedded />

        <nav aria-label={t('public.detail.ariaTabs')} className="p-2 sm:p-2.5 bg-white dark:bg-[#1B201D]">
          <div role="tablist" className="grid grid-cols-4 gap-1.5">
            {PRIMARY_TABS.map(({ key, icon: Icon, label }) => {
              const isActive = active === key || (key === 'matches' && active === 'results')
              const displayLabel =
                key === 'teams' && tour.tournament_format === 'league' ? 'الفرق' : label
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSection(key)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2.5 px-1.5 text-center transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                      : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] hover:bg-[#E9ECE7] dark:hover:bg-[#303832]'
                  }`}
                >
                  <Icon className="size-4.5 stroke-[2.3]" />
                  <span className="text-[11px] sm:text-xs font-black leading-tight truncate max-w-full">
                    {displayLabel}
                  </span>
                </button>
              )
            })}
          </div>

          {secondarySections.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 pt-2">
              {secondarySections.map(({ key, icon: Icon, label }) => {
                const isActive = active === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleSection(key)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#111313] dark:bg-[#D0FF38] text-white dark:text-[#111313]'
                        : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2]'
                    }`}
                  >
                    <Icon className="size-3.5" />
                    <span>{t(label)}</span>
                  </button>
                )
              })}
            </div>
          )}
        </nav>
      </div>

      <RegistrationSection tour={tour} />

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
            <div className="mt-4 space-y-4">
              <LiveMatchActivity
                load={() => api.get(`/v1/tournaments/${slug}/live`).then((r) => r.data.data)}
                deps={[slug]}
                enabled={Boolean(tour)}
              />
              <SponsorsSection sponsors={sponsorsQuery.data} />
              <PartnersSection partners={partnersQuery.data} />
              <ContactSection contact={contactQuery.data} tournamentKey={slug} />
            </div>

            {/* Live Matches Quick Action Pill (Matches Reference Screenshot Bottom-Left Pill) */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleLiveMatchesJump}
                className="inline-flex items-center gap-2 rounded-full bg-[#E11D48] hover:bg-[#BE123C] px-4 py-2.5 text-xs font-black text-white shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <Radio className="size-4 animate-pulse" />
                <span>{t('committee.detail.live.badge', 'مباريات مباشرة')}</span>
              </button>
            </div>
          </>
        )}

        {active === 'teams' && (
          <TeamsSection
            teams={teamsQuery.data}
            standings={standingsQuery.data}
            loading={teamsQuery.loading || (teamsQuery.isFetching && teamsQuery.data == null)}
          />
        )}

        {(active === 'matches' || active === 'results') && (
          <>
            <div className="mb-4">
              <LiveMatchActivity
                load={() => api.get(`/v1/tournaments/${slug}/live`).then((r) => r.data.data)}
                deps={[slug]}
                enabled={Boolean(tour)}
              />
            </div>
            <FixturesSection
              fixtures={fixturesQuery.data}
              mode={active === 'results' ? 'finished' : 'all'}
              onOpen={setOpenMatch}
            />
          </>
        )}

        {active === 'news' && <NewsSection news={newsQuery.data} tournamentKey={slug} />}

        {active === 'gallery' && <GallerySection gallery={galleryQuery.data} />}

        {(() => {
          if (active !== 'standings') return null
          const nonEmptyStandingGroups = (standingsQuery.data?.groups || []).filter((g) => (g.rows || g.teams || []).length > 0)
          if (nonEmptyStandingGroups.length === 0) {
            return (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]">
                  <Trophy className="size-6" />
                </span>
                <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">{t('public.tournamentPage.noStandings')}</p>
              </div>
            )
          }
          return <StandingsTable groups={nonEmptyStandingGroups} />
        })()}

        {active === 'scorers' && <ScorersSection stats={statsQuery.data} />}

        {active === 'bracket' && (bracketQuery.data?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A]">
              <Network className="size-6" />
            </span>
            <p className="text-sm font-bold text-[#65706A] dark:text-[#B2B9B3]">{t('public.tournamentPage.noBracket')}</p>
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
