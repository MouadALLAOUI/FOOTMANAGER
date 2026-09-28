import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trophy, Calendar, MapPin, ArrowLeft, ArrowRight } from 'lucide-react'

export default function ProductionOpenTournaments() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-lg bg-amber-100 text-amber-700">
            <Trophy className="size-3.5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {isRtl ? 'البطولات المفتوحة' : 'Open Tournaments'}
          </h2>
        </div>

        <Link
          to="/dashboard/tournaments"
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <span>{isRtl ? 'عرض الكل' : 'View all'}</span>
          <ArrowIcon className="size-3.5" />
        </Link>
      </div>

      {/* Tournament Card */}
      <div className="flex flex-col justify-between flex-1 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-emerald-300 transition-all">
        <div>
          {/* Banner with Badge */}
          <div className="relative h-24 sm:h-28 w-full bg-slate-800 overflow-hidden">
            <img
              src="/tournament_banner.png"
              alt="Tournament Banner"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.target.src = '/stadium_sample_1.png'
              }}
            />
            <div className="absolute top-2.5 start-2.5">
              <span className="rounded-full bg-emerald-500/90 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
                {isRtl ? 'جاري التسجيل' : 'Registration Open'}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 space-y-1.5 text-center sm:text-start">
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              {isRtl ? 'الدوري المحلي 2024' : 'Local League 2024'}
            </h3>

            <p className="text-xs font-bold text-slate-500">
              {isRtl ? 'كرة القدم • 8 فرق' : 'Football • 8 Teams'}
            </p>

            <p className="text-xs font-black text-rose-600">
              {isRtl ? 'آخر أجل للتسجيل: 5 أيام' : 'Deadline in 5 days'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 pt-1 text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="size-3 text-slate-400" />
                <span>{isRtl ? 'نونبر 2024' : 'Nov 2024'}</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-emerald-600" />
                <span>{isRtl ? 'الدار البيضاء' : 'Casablanca'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-4 pt-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard/tournaments')}
            className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-xs transition-colors"
          >
            {isRtl ? 'عرض البطولة' : 'View Tournament'}
          </button>
        </div>
      </div>
    </div>
  )
}
