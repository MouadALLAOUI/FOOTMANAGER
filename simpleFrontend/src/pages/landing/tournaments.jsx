import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowLeft, faTrophy } from '@fortawesome/free-solid-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import TournamentCard from '../../components/tournaments/TournamentCard'
import { useSnapCarousel } from '../../hooks/useSnapCarousel'
import { CarouselDots } from '../../components/Carousel'

function SkeletonCard() {
  return (
    <div className="h-full w-[82%] max-w-[320px] shrink-0 snap-start animate-pulse overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 md:w-auto">
      <div className="h-[170px] bg-slate-200" />
      <div className="space-y-3 p-5 pt-7">
        <div className="h-5 w-3/4 rounded-full bg-slate-200" />
        <div className="h-3 w-full rounded-full bg-slate-200" />
        <div className="h-3 w-2/3 rounded-full bg-slate-200" />
        <div className="h-3 w-1/2 rounded-full bg-slate-200" />
        <div className="h-11 w-full rounded-2xl bg-slate-200" />
      </div>
    </div>
  )
}

export default function Tournaments() {
  const { t } = useTranslation()
  const { data, loading } = useApi(
    () => api.get('/v1/tournaments', { params: { per_page: 8 } }).then((r) => r.data),
  )
  const tournaments = (data?.data || []).filter(
    (tour) => !['completed', 'cancelled'].includes(tour.status),
  )
  const { ref, count, active, goTo } = useSnapCarousel(tournaments)

  return (
    <section id="tournaments" className="bg-[#f6f7fb] py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <header className="flex flex-wrap items-end justify-between gap-6">
          <div className="text-start">
            <span className="mb-3 block h-1 w-10 rounded-full bg-green-500" aria-hidden="true" />
            <h2 className="text-3xl font-black text-slate-900 lg:text-4xl">
              {t('landing.tournaments.title')}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-500 lg:text-base">
              {t('landing.tournaments.subtitle')}
            </p>
          </div>
          <Link
            to="/tournaments"
            className="group flex items-center gap-2 text-sm font-bold text-green-600 transition-colors hover:text-green-700"
          >
            <span>{t('landing.tournaments.viewAll')}</span>
            <FontAwesomeIcon icon={faArrowLeft} className="size-4 transition-transform duration-300 group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1" />
          </Link>
        </header>

        <div className="mt-12">
          {loading ? (
            <div className="flex snap-x gap-6 overflow-x-auto no-scrollbar scroll-ps-2 px-2 pb-4 md:grid md:grid-cols-2 md:gap-7 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
              <span className="grid size-16 place-items-center rounded-3xl bg-green-50 text-green-500">
                <FontAwesomeIcon icon={faTrophy} className="size-7" />
              </span>
              <p className="mt-4 text-sm font-bold text-slate-700">{t('landing.tournaments.empty')}</p>
              <p className="mt-1 text-xs text-slate-400">{t('landing.tournaments.emptyDesc')}</p>
            </div>
          ) : (
            <>
              <div
                ref={ref}
                className="flex snap-x gap-6 overflow-x-auto no-scrollbar scroll-ps-2 px-2 pb-4 md:grid md:grid-cols-2 md:gap-7 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3"
              >
                {tournaments.map((tour) => (
                  <TournamentCard key={tour.id} tournament={tour} className="md:w-auto" />
                ))}
              </div>
              <CarouselDots count={count} active={active} goTo={goTo} />
            </>
          )}
        </div>
      </div>
    </section>
  )
}
