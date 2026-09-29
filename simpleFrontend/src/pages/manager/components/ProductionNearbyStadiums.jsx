import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, MapPin, Star, ArrowLeft, ArrowRight, Zap, Building2 } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import { Skeleton } from '../../../components/dashboard/ui'
import { coverThumb } from '../../../lib/thumb'

export default function ProductionNearbyStadiums() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stadiums, loadingBy } = useCommandCenter()

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fav_stadiums') || '[]')
    } catch {
      return []
    }
  })

  const toggleFavorite = (id, e) => {
    e.stopPropagation()
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try {
        localStorage.setItem('fav_stadiums', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const isLoading = loadingBy?.stadiums
  const displayStadiums = (stadiums || []).slice(0, 3)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <Zap className="size-3.5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {isRtl ? 'الملاعب القريبة منك' : 'Nearby Stadiums'}
          </h2>
        </div>

        <Link
          to="/fields"
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <span>{isRtl ? 'عرض الكل' : 'View all'}</span>
          <ArrowIcon className="size-3.5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
              <Skeleton className="h-28 w-full rounded-none" />
              <div className="p-3.5 space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-full rounded-xl mt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : displayStadiums.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-xs">
          <div className="grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-400 mb-2">
            <Building2 className="size-6" />
          </div>
          <h3 className="text-xs font-black text-slate-900">
            {isRtl ? 'لا توجد ملاعب مسجلة حالياً' : 'No stadiums available right now'}
          </h3>
          <p className="mt-1 text-[11px] font-semibold text-slate-400 max-w-xs">
            {isRtl ? 'تصفح قائمة الملاعب لاستكشاف الملاعب في المدن المجاورة.' : 'Browse the fields directory to discover venues in surrounding areas.'}
          </p>
          <div className="mt-3">
            <Link
              to="/fields"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 transition-colors"
            >
              <span>{isRtl ? 'استعراض كل الملاعب' : 'Browse All Pitches'}</span>
            </Link>
          </div>
        </div>
      ) : (
        /* 3 Real Stadiums Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {displayStadiums.map((stadium, idx) => {
            const realThumb = coverThumb(stadium)
            const price = stadium.price_per_hour || 0
            const rating = stadium.rating ? Number(stadium.rating).toFixed(1) : null
            const city = stadium.city || stadium.region || ''
            const isFav = favorites.includes(stadium.id)

            return (
              <div
                key={stadium.id || idx}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <div>
                  {/* Photo */}
                  <div className="relative h-28 w-full overflow-hidden bg-slate-100">
                    {realThumb ? (
                      <img
                        src={realThumb}
                        alt={stadium.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          const placeholder = e.currentTarget.parentElement?.querySelector('.stadium-placeholder')
                          if (placeholder) {
                            placeholder.classList.remove('hidden')
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={`stadium-placeholder ${
                        realThumb ? 'hidden ' : ''
                      }absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-100 to-emerald-100/50 text-slate-400`}
                    >
                      <Building2 className="size-8 text-emerald-600/50" />
                    </div>

                    {/* Favorite Heart Button */}
                    <button
                      type="button"
                      onClick={(e) => toggleFavorite(stadium.id, e)}
                      aria-label={isRtl ? 'إضافة إلى المفضلة' : 'Favorite'}
                      className="absolute top-2 end-2 grid size-7 place-items-center rounded-full bg-white/90 backdrop-blur-xs text-slate-600 hover:text-rose-500 hover:bg-white shadow-xs transition-colors"
                    >
                      <Heart
                        className={`size-3.5 transition-colors ${
                          isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-500 hover:text-rose-500'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between">
                      {rating ? (
                        <span className="flex items-center gap-1 text-[11px] font-black text-amber-500">
                          <Star className="size-3 fill-amber-400 stroke-amber-400" />
                          <span>{rating}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {isRtl ? 'ملعب جديد' : 'New venue'}
                        </span>
                      )}
                      {city && (
                        <span className="flex items-center gap-0.5 text-[11px] font-semibold text-slate-400 truncate">
                          <MapPin className="size-3" />
                          <span>{city}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-slate-900 truncate">
                      {stadium.name}
                    </h3>

                    {price > 0 && (
                      <p className="text-xs font-black text-emerald-700 pt-1">
                        {price} {isRtl ? 'درهم / ساعة' : 'MAD / hr'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Book Button */}
                <div className="p-3.5 pt-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/fields?book=${stadium.id}`)}
                    className="w-full rounded-xl border border-emerald-600 hover:bg-emerald-50 py-2 text-xs font-black text-emerald-700 transition-colors"
                  >
                    {isRtl ? 'حجز الآن' : 'Book Now'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
