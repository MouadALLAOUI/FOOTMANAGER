import { useTranslation } from 'react-i18next'
import { useCitiesSelect } from '../../api/queries'

export default function PopularSearches({ onSelect }) {
  const { t } = useTranslation()
  const { data: citiesData } = useCitiesSelect()
  const cities = citiesData?.cities || []

  // Show top 6 cities by sort_order
  const popularCities = cities.slice(0, 6)

  return (
    <div className="mx-auto mt-10 max-w-4xl px-6 text-center lg:mt-12">
      <h3 className="text-sm font-bold tracking-wide text-slate-300">
        {t('landing.hero.popularTitle')}
      </h3>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        {popularCities.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.slug)}
            className="bidi-plaintext rounded-full bg-slate-900/80 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-black/30 ring-1 ring-white/15 backdrop-blur-sm transition hover:-translate-y-0.5 hover:bg-green-500 hover:ring-green-500"
          >
            {c.localized_name}
          </button>
        ))}
      </div>
    </div>
  )
}
