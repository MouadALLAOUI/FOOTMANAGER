import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, MapPin, Star, ArrowLeft, ArrowRight, Zap } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'

export default function ProductionNearbyStadiums() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { stadiums } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const displayStadiums = stadiums && stadiums.length > 0 ? stadiums.slice(0, 3) : [
    {
      id: 1,
      name: isRtl ? 'ملعب الحي المحمدي' : 'Hay Mohammadi Pitch',
      city: isRtl ? 'الدار البيضاء' : 'Casablanca',
      rating: '4.8',
      price_per_hour: 100,
      image: '/stadium_sample_1.png',
    },
    {
      id: 2,
      name: isRtl ? 'ملعب الزهراء' : 'Al Zahra Stadium',
      city: isRtl ? 'الدار البيضاء' : 'Casablanca',
      rating: '4.6',
      price_per_hour: 80,
      image: '/stadium_sample_2.png',
    },
    {
      id: 3,
      name: isRtl ? 'ملعب النخيل' : 'Al Nakhil Stadium',
      city: isRtl ? 'الدار البيضاء' : 'Casablanca',
      rating: '4.5',
      price_per_hour: 90,
      image: '/stadium_sample_3.png',
    },
  ]

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

      {/* 3 Stadiums Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {displayStadiums.map((stadium, idx) => {
          const imgSrc = stadium.cover_image || stadium.image || `/stadium_sample_${(idx % 3) + 1}.png`
          const price = stadium.price_per_hour || 100
          const rating = stadium.rating || (4.5 + (idx * 0.1)).toFixed(1)
          const city = stadium.city || (isRtl ? 'الدار البيضاء' : 'Casablanca')

          return (
            <div
              key={stadium.id || idx}
              className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <div>
                {/* Photo with Heart Favorite */}
                <div className="relative h-28 w-full overflow-hidden bg-slate-100">
                  <img
                    src={imgSrc}
                    alt={stadium.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      e.target.src = '/stadium_sample_1.png'
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Favorite"
                    className="absolute top-2.5 end-2.5 grid size-7 place-items-center rounded-full bg-white/80 backdrop-blur-xs text-rose-500 shadow-xs hover:bg-white"
                  >
                    <Heart className="size-3.5 fill-rose-500" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[11px] font-black text-amber-500">
                      <Star className="size-3 fill-amber-400 stroke-amber-400" />
                      <span>{rating}</span>
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">{city}</span>
                  </div>

                  <h3 className="text-sm font-black text-slate-900 truncate">
                    {stadium.name}
                  </h3>

                  <p className="text-xs font-black text-emerald-700 pt-1">
                    {price} {isRtl ? 'درهم / ساعة' : 'MAD / hr'}
                  </p>
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
    </div>
  )
}
