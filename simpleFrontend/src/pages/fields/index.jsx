import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { toStadiumCard, cityFilterValue } from '../../lib/adapters'
import BookingModal from '../../components/public/BookingModal'
import { usePublicActions } from '../../components/public/usePublicActions'
import FieldsHero from './hero'
import FieldsSearchPanel from './searchPanel'
import FilterToolbar from './filterToolbar'
import ResultSummary from './resultSummary'
import FieldsGrid from './fieldsGrid'
import Pagination from './pagination'
import EmptyState from './emptyState'
import LoadingState from './loadingState'

const PAGE_SIZE = 12
const emptyFilters = { type: 'all', surface: 'all', cover: 'all' }
const FORMATS = ['5v5', '7v7', '11v11']

function buildParams({ city, panelType, filters, sort, page, t }) {
  const params = { per_page: PAGE_SIZE, page }

  const cityValue = cityFilterValue(city, t)
  if (cityValue) params.city = cityValue

  if (panelType) {
    if (FORMATS.includes(panelType)) params.player_format = panelType
    else if (panelType === 'covered' || panelType === 'open') params.coverage = panelType === 'covered' ? 'covered' : 'outdoor'
    else params.type = panelType
  }

  if (filters.type !== 'all') params.player_format = filters.type
  if (filters.surface !== 'all') params.type = filters.surface === 'natural' ? 'grass' : 'synthetic'
  if (filters.cover !== 'all') params.coverage = filters.cover === 'covered' ? 'covered' : 'outdoor'

  params.sort =
    sort === 'nearest'
      ? 'distance'
      : sort === 'priceAsc'
        ? 'price_asc'
        : sort === 'priceDesc'
          ? 'price_desc'
          : 'rating'

  return params
}

export default function Fields() {
  const { t, i18n } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const [city, setCity] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [panelType, setPanelType] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [sort, setSort] = useState('nearest')
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)
  const [booking, setBooking] = useState(null)

  const { openBooking } = usePublicActions({ onBooking: setBooking })

  const params = useMemo(
    () => buildParams({ city, panelType, filters, sort, page, t }),
    [city, panelType, filters, sort, page, t],
  )

  const { data, loading } = useApi(
    () => api.get('/v1/stadiums', { params }).then((r) => r.data),
    [params],
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const bookParam = searchParams.get('book')

  useEffect(() => {
    if (bookParam) {
      openBooking({ id: bookParam })
      const next = new URLSearchParams(searchParams)
      next.delete('book')
      setSearchParams(next, { replace: true })
    }
  }, [bookParam, searchParams, setSearchParams, openBooking])

  useEffect(() => {
    setPage(1)
  }, [city, date, time, panelType, filters, sort])

  const fields = (data?.data || []).map(toStadiumCard)
  const total = data?.meta?.total ?? 0
  const pageCount = Math.max(1, data?.meta?.last_page ?? 1)
  const currentPage = Math.min(page, pageCount)
  const from = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, total)

  const handlePanelChange = (patch) => {
    if ('city' in patch) setCity(patch.city)
    if ('date' in patch) setDate(patch.date)
    if ('time' in patch) setTime(patch.time)
    if ('type' in patch) setPanelType(patch.type)
  }

  const handleSearch = () => {
    setPage(1)
    document.getElementById('fields-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleFilter = (category, value) => {
    setFilters((prev) => (prev[category] === value ? { ...prev, [category]: 'all' } : { ...prev, [category]: value }))
  }

  const resetAll = () => {
    setCity('')
    setDate('')
    setTime('')
    setPanelType('')
    setFilters(emptyFilters)
    setSort('nearest')
    setPage(1)
  }

  const activeFilters = []
  if (city) activeFilters.push({ key: 'city', label: t(`landing.hero.cities.${city}`), onRemove: () => setCity('') })
  if (date)
    activeFilters.push({
      key: 'date',
      label: new Date(`${date}T00:00:00`).toLocaleDateString(i18n.language.startsWith('ar') ? 'ar-MA' : 'en-GB', { day: 'numeric', month: 'short' }),
      onRemove: () => setDate(''),
    })
  if (time) activeFilters.push({ key: 'time', label: time, onRemove: () => setTime('') })
  if (panelType)
    activeFilters.push({ key: 'type', label: t(`fieldsPage.search.types.${panelType}`), onRemove: () => setPanelType('') })

  return (
    <>
      <FieldsHero />
      <FieldsSearchPanel values={{ city, date, time, type: panelType }} onChange={handlePanelChange} onSearch={handleSearch} />

      <main className="mx-auto max-w-[1400px] px-6 pb-48 pt-10 lg:pb-40">
        <FilterToolbar
          filters={filters}
          onToggle={toggleFilter}
          onReset={resetAll}
          sort={sort}
          onSortChange={setSort}
          view={view}
          onViewChange={setView}
        />

        <ResultSummary count={total} from={from} to={to} activeFilters={activeFilters} />

        <div id="fields-results" className="scroll-mt-24">
          {loading ? (
            <LoadingState />
          ) : fields.length > 0 ? (
            <>
              <FieldsGrid fields={fields} view={view} onBook={openBooking} />
              <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />
            </>
          ) : (
            <EmptyState onReset={resetAll} />
          )}
        </div>
      </main>

      <BookingModal open={Boolean(booking)} onClose={() => setBooking(null)} field={booking} />
    </>
  )
}
