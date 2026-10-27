import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import TournamentCard from '../../components/tournaments/TournamentCard'
import { useSnapCarousel } from '../../hooks/useSnapCarousel'
import { CarouselDots } from '../../components/Carousel'

function SkeletonCard() {
  return (
    <div className="h-full w-[82%] max-w-[320px] shrink-0 snap-start animate-pulse overflow-hidden rounded-3xl bg-slate-800/40 border border-slate-700/50 p-4 md:w-auto">
      <div className="h-[170px] rounded-2xl bg-slate-700/50" />
      <div className="space-y-3 p-3 pt-5">
        <div className="h-5 w-3/4 rounded-full bg-slate-700/50" />
        <div className="h-3 w-full rounded-full bg-slate-700/50" />
        <div className="h-3 w-2/3 rounded-full bg-slate-700/50" />
        <div className="h-10 w-full rounded-2xl bg-slate-700/50" />
      </div>
    </div>
  )
}

export default function Tournaments({ theme = 'dark' }) {
  const { t } = useTranslation()
  const { data, loading } = useApi(
    () => api.get('/v1/tournaments', { params: { per_page: 6 } }).then((r) => r.data),
  )

  // Only open or ongoing active tournaments
  const tournaments = (data?.data || []).filter((tour) =>
    ['open', 'ongoing', 'in_progress', 'registration_open'].includes(tour.status) ||
    (!['completed', 'cancelled', 'draft'].includes(tour.status) && tour.status)
  )

  const { ref, count, active, goTo } = useSnapCarousel(tournaments)
  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  // Rule: If loading or no open/ongoing tournaments, hide section entirely (title, description, and space)
  const hasTournaments = tournaments.length > 0

  return (
    <div id="tournaments-wrapper">


      {/* Featured Tournaments Section: Disappears completely if 0 active tournaments */}
      {hasTournaments && (
        <section id="tournaments" aria-labelledby="featured-tournaments-heading" className="py-8 sm:py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-4 mb-6 border-slate-300 dark:border-emerald-900/40">
              <div>
                <h2
                  id="featured-tournaments-heading"
                  className="text-2xl sm:text-3xl font-black tracking-tight text-[#14221C] dark:text-white"
                >
                  بطولات مميزة
                </h2>
                <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                  استكشف أحدث دوريات كرة القدم المحلية وسجّل فريقك للمنافسة على الألقاب الرسمية
                </p>
              </div>

              <Link
                to="/tournaments"
                className="group inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-black text-[#1F7A4D] hover:text-[#14221C] dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
              >
                <span>عرض كافة البطولات</span>
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
            </header>

            {/* Tournaments Grid / Carousel */}
            <div>
              <div
                ref={ref}
                className="flex snap-x gap-6 overflow-x-auto no-scrollbar scroll-ps-2 px-2 pb-4 md:grid md:grid-cols-2 md:gap-7 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3"
              >
                {tournaments.map((tour) => (
                  <div key={tour.id} className="h-full w-[82%] max-w-[320px] shrink-0 snap-start md:w-auto">
                    <TournamentCard tournament={tour} />
                  </div>
                ))}
              </div>

              {count > 1 && (
                <div className="mt-4 flex justify-center md:hidden">
                  <CarouselDots count={count} active={active} onSelect={goTo} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
