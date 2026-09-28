import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Swords, Star, ArrowLeft, ArrowRight } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import TeamLogo from '../../../components/profile/TeamLogo'

export default function ProductionSuggestedTeams() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { market } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const displayTeams = market && market.length > 0 ? market.slice(0, 4) : [
    { id: 1, name: isRtl ? 'النسور' : 'Al Nousour', city: isRtl ? 'الدار البيضاء' : 'Casablanca', rating: '4.3' },
    { id: 2, name: isRtl ? 'اتحاد النصر' : 'Ittihad Al Nasr', city: isRtl ? 'المحمدية' : 'Mohammedia', rating: '4.4' },
    { id: 3, name: isRtl ? 'نجوم السلام' : 'Noujoum Salam', city: isRtl ? 'الدار البيضاء' : 'Casablanca', rating: '4.5' },
    { id: 4, name: isRtl ? 'شباب المدينة' : 'Shabab Al Madina', city: isRtl ? 'الدار البيضاء' : 'Casablanca', rating: '4.7' },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <Swords className="size-3.5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {isRtl ? 'اقتراحات الفرق للتحدي' : 'Suggested Teams to Challenge'}
          </h2>
        </div>

        <Link
          to="/dashboard/feed"
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <span>{isRtl ? 'عرض الكل' : 'View all'}</span>
          <ArrowIcon className="size-3.5" />
        </Link>
      </div>

      {/* 4 Teams Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {displayTeams.map((tItem, idx) => {
          const tName = tItem.name || tItem.host_team?.name || (isRtl ? 'فريق رياضي' : 'Team')
          const tCity = tItem.city || tItem.host_team?.city || (isRtl ? 'الدار البيضاء' : 'Casablanca')
          const rating = tItem.rating || (4.2 + (idx * 0.1)).toFixed(1)

          return (
            <div
              key={tItem.id || idx}
              className="group flex flex-col items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 text-center shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 p-1 border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform">
                  <TeamLogo name={tName} className="size-9" rounded="rounded-xl" fontSize="text-sm" />
                </div>

                <h3 className="mt-2 text-xs font-black text-slate-900 line-clamp-1">
                  {tName}
                </h3>

                <p className="text-[10px] font-semibold text-slate-400">
                  {tCity}
                </p>

                <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-500">
                  <Star className="size-3 fill-amber-400 stroke-amber-400" />
                  <span>{rating}</span>
                </div>
              </div>

              <div className="mt-3 w-full">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard/feed')}
                  className="w-full rounded-xl border border-emerald-600 hover:bg-emerald-50 py-1.5 text-[11px] font-black text-emerald-700 transition-colors"
                >
                  {isRtl ? 'تحدي الفريق' : 'Challenge'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
