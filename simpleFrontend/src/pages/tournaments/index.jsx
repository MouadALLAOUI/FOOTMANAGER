import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchX, Trophy } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import useSeo from '../../hooks/useSeo'
import { Button, Empty, Pagination } from '../../components/dashboard/ui'
import TournamentsHero from './list/hero'
import FeaturedTournaments from './list/upcoming'
import FilterBar from './list/filterBar'
import TournamentCard, { CardSkeleton } from './list/tournamentCard'
import OrganizerSection from './list/organizerSection'
import FinalCta from './list/finalCta'

const STATUSES = ['open_for_registration', 'registration_closed', 'in_progress', 'completed']
const FORMATS = ['groups_knockout', 'groups_only', 'knockout_only', 'league', 'custom']
const STATUS_PRIORITY = { open_for_registration: 0, registration_closed: 1, in_progress: 2, completed: 3 }
const PER_PAGE = 9

const sortTournaments = (list) =>
  [...list].sort(
    (a, b) =>
      (STATUS_PRIORITY[a.status] ?? 9) - (STATUS_PRIORITY[b.status] ?? 9) ||
      (a.start_date ? Date.parse(a.start_date) : Infinity) - (b.start_date ? Date.parse(b.start_date) : Infinity),
  )

export default function TournamentsIndex() {
  const { t, i18n } = useTranslation()

  useSeo({
    title: t('public.tournaments.seoTitle', 'دوريات وبطولات كرة القدم للهواة بالمغرب | أجي نقصرو'),
    description: t(
      'public.tournaments.seoDesc',
      'تصفح دوريات وبطولات كرة القدم للهواة في المغرب عبر منصة أجي نقصرو. تابع جداول المباريات، المجموعات، نتائج المباريات والترتيب المباشر أو نظّم بطولتك باحترافية.',
    ),
    canonical: 'https://ajin9essro.com/tournaments',
    keywords:
      'دوريات كرة القدم بالمغرب, بطولة أحياء المغرب, دوري الهواة, تنظيم بطولات كورة, ملاعب المغرب, أجي نقصرو, tournoi football maroc, ajin9essro',
  })

  const { data, loading, error, refetch } = useApi(
    () => api.get('/v1/tournaments', { params: { per_page: 50 } }).then((r) => r.data),
    [],
    { staleTime: 60_000 },
  )

  const tournaments = useMemo(() => sortTournaments(data?.data || []), [data])
  const [filters, setFilters] = useState({ status: 'all', format: 'all', location: 'all' })
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [searchInput])

  const featuredTournaments = useMemo(() => {
    const now = Date.now()
    const qualifying = tournaments.filter((x) => {
      if (x.status === 'open_for_registration' || x.registration_open) return true
      if (x.status === 'in_progress') return true
      if (x.start_date && Date.parse(x.start_date) >= now) return true
      return false
    })
    return sortTournaments(qualifying).slice(0, 6)
  }, [tournaments])

  const stats = useMemo(
    () =>
      tournaments.length
        ? {
            total: tournaments.length,
            upcoming: tournaments.filter(
              (x) =>
                x.status === 'open_for_registration' ||
                (x.start_date && Date.parse(x.start_date) >= Date.now()),
            ).length,
            open: tournaments.filter((x) => x.registration_open || x.status === 'open_for_registration').length,
          }
        : null,
    [tournaments],
  )

  const locations = useMemo(
    () =>
      [...new Set(tournaments.map((x) => x.location).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, i18n.language),
      ),
    [tournaments, i18n.language],
  )

  const statusOptions = STATUSES.map((s) => ({ value: s, label: t(`status.${s}`, s) }))
  const formatOptions = FORMATS.map((f) => ({
    value: f,
    label: t(`committee.tournaments.formats.${f}`, f),
  }))
  const locationOptions = locations.map((l) => ({ value: l, label: l }))

  const filtered = useMemo(() => {
    let list = [...tournaments]
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((x) => `${x.name} ${x.location || ''} ${x.description || ''}`.toLowerCase().includes(q))
    }
    if (filters.status !== 'all') list = list.filter((x) => x.status === filters.status)
    if (filters.format !== 'all') list = list.filter((x) => x.tournament_format === filters.format)
    if (filters.location !== 'all') list = list.filter((x) => x.location === filters.location)
    return sortTournaments(list)
  }, [tournaments, search, filters])

  const activeCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.format !== 'all' ? 1 : 0) +
    (filters.location !== 'all' ? 1 : 0)
  const lastPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, lastPage)
  const pageItems = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  const onFilterChange = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const resetFilters = () => {
    setFilters({ status: 'all', format: 'all', location: 'all' })
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  return (
    <>
      {/* SECTION 1 — HERO */}
      <TournamentsHero stats={stats} />

      <main id="main-content">
        <div className="mx-auto mb-28 w-full max-w-[1400px] space-y-12 px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:space-y-16">
          {/* SECTION 2 — FEATURED TOURNAMENTS (Auto-hidden if none qualify) */}
          {!loading && !error && (
            <FeaturedTournaments tournaments={featuredTournaments} />
          )}

          {/* SECTION 3 — COMPLETE TOURNAMENTS DIRECTORY */}
          <section id="tournaments-directory" className="scroll-mt-24" aria-labelledby="directory-heading">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-black tracking-wider text-green-600 uppercase">
                  {t('public.tournaments.directoryEyebrow', 'دليل المسابقات')}
                </p>
                <h2 id="directory-heading" className="mt-1 text-2xl font-black text-slate-900 md:text-3xl">
                  {t('public.tournaments.listTitle', 'دليل البطولات الكامل')}
                </h2>
                <p className="mt-1 text-xs font-semibold text-slate-500 sm:text-sm">
                  {t('public.tournaments.subtitle', 'تابع البطولات الرسمية والنتائج والترتيبات')}
                </p>
              </div>
              {!loading && !error && tournaments.length > 0 && (
                <span className="rounded-full bg-green-50 px-3.5 py-1.5 text-xs font-black text-green-700 ring-1 ring-green-100">
                  {t('public.tournaments.filters.results', { count: filtered.length })}
                </span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-[24px] border border-dashed border-rose-200 bg-white p-8 text-center sm:p-12">
                <Empty
                  icon={SearchX}
                  title={t('public.tournaments.loadError', 'تعذر تحميل البطولات')}
                  description={t('public.tournaments.loadErrorDesc', 'تحقق من اتصالك ثم أعد المحاولة.')}
                  action={
                    <Button variant="primary" onClick={() => refetch()}>
                      {t('common.retry', 'إعادة المحاولة')}
                    </Button>
                  }
                />
              </div>
            ) : tournaments.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center sm:p-12">
                <Empty
                  icon={Trophy}
                  title={t('public.tournaments.empty', 'لا توجد بطولات منشورة بعد')}
                  description={t('public.tournaments.emptyDesc', 'ستظهر البطولات العامة هنا بمجرد نشرها من اللجان المنظمة.')}
                />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <FilterBar
                    search={searchInput}
                    onSearch={setSearchInput}
                    filters={filters}
                    onFilterChange={onFilterChange}
                    statusOptions={statusOptions}
                    formatOptions={formatOptions}
                    locationOptions={locationOptions}
                    activeCount={activeCount}
                    onReset={resetFilters}
                  />
                </div>

                {filtered.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center sm:p-12">
                    <Empty
                      icon={SearchX}
                      title={t('public.tournaments.noResults', 'لا توجد بطولات تطابق بحثك')}
                      description={t('public.tournaments.noResultsDesc', 'جرّب تعديل البحث أو مسح بعض الفلاتر.')}
                      action={
                        <Button variant="outline" onClick={resetFilters}>
                          {t('public.tournaments.filters.reset', 'مسح الفلاتر')}
                        </Button>
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {pageItems.map((tour) => (
                        <TournamentCard key={tour.id} tour={tour} />
                      ))}
                    </div>
                    {filtered.length > PER_PAGE && (
                      <div className="mt-8">
                        <Pagination
                          bare
                          page={safePage}
                          lastPage={lastPage}
                          total={filtered.length}
                          perPage={PER_PAGE}
                          onChange={setPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </section>

          {/* SECTION 4 — ORGANIZER / ASSOCIATION MARKETING */}
          <OrganizerSection />

          {/* SECTION 5 — FINAL CALL TO ACTION */}
          <FinalCta />
        </div>
      </main>
    </>
  )
}
