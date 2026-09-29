import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Swords, Star, ArrowLeft, ArrowRight, Plus } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import TeamLogo from '../../../components/profile/TeamLogo'
import { Skeleton } from '../../../components/dashboard/ui'

export default function ProductionSuggestedTeams() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { market, loadingBy, openCreate } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const isLoading = loadingBy?.market
  const displayTeams = (market || []).slice(0, 4)

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

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 text-center shadow-xs">
              <Skeleton className="size-12 rounded-2xl mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mb-1 mx-auto" />
              <Skeleton className="h-2.5 w-12 mb-2 mx-auto" />
              <Skeleton className="h-7 w-full rounded-xl mt-2" />
            </div>
          ))}
        </div>
      ) : displayTeams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-xs">
          <div className="grid size-12 place-items-center rounded-2xl bg-slate-50 text-slate-400 mb-2">
            <Swords className="size-6" />
          </div>
          <h3 className="text-xs font-black text-slate-900">
            {isRtl ? 'لا توجد طلبات تحدي مفتوحة حالياً' : 'No open challenges right now'}
          </h3>
          <p className="mt-1 text-[11px] font-semibold text-slate-400 max-w-xs">
            {isRtl ? 'كن أول من ينشئ طلباً لمواجهة فريق منافس في منطقتك.' : 'Be the first to post a friendly match invitation.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-colors"
            >
              <Plus className="size-3" />
              <span>{isRtl ? 'إنشاء تحدٍ' : 'Create Challenge'}</span>
            </button>
            <Link
              to="/dashboard/feed"
              className="inline-flex items-center rounded-xl border border-slate-200 hover:bg-slate-50 px-3.5 py-1.5 text-xs font-black text-slate-700 transition-colors"
            >
              <span>{isRtl ? 'سوق المباريات' : 'Match Feed'}</span>
            </Link>
          </div>
        </div>
      ) : (
        /* 4 Real Teams Grid */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {displayTeams.map((tItem, idx) => {
            const teamObj = tItem.host_team || tItem
            const tName = teamObj.name || (isRtl ? 'فريق رياضي' : 'Team')
            const tCity = teamObj.city || (isRtl ? 'المغرب' : 'Morocco')
            const rating = teamObj.rating ? Number(teamObj.rating).toFixed(1) : null

            return (
              <div
                key={tItem.id || idx}
                className="group flex flex-col items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 text-center shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <div>
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-50 p-1 border border-slate-200 shadow-2xs group-hover:scale-105 transition-transform">
                    <TeamLogo team={teamObj} name={tName} className="size-9" rounded="rounded-xl" fontSize="text-sm" />
                  </div>

                  <h3 className="mt-2 text-xs font-black text-slate-900 line-clamp-1">
                    {tName}
                  </h3>

                  <p className="text-[10px] font-semibold text-slate-400">
                    {tCity}
                  </p>

                  {rating && (
                    <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-bold text-amber-500">
                      <Star className="size-3 fill-amber-400 stroke-amber-400" />
                      <span>{rating}</span>
                    </div>
                  )}
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
      )}
    </div>
  )
}
