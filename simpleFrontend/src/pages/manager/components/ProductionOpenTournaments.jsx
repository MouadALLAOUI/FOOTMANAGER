import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Trophy, Calendar, MapPin, ArrowLeft, ArrowRight, TrophyIcon } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import { Skeleton } from '../../../components/dashboard/ui'

export default function ProductionOpenTournaments() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { tournaments, loadingBy } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const isLoading = loadingBy?.tournaments
  const activeTournament = tournaments && tournaments.length > 0 ? tournaments[0] : null

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

      {isLoading ? (
        <div className="flex flex-col justify-between flex-1 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
          <Skeleton className="h-28 w-full rounded-none" />
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
            <div className="pt-3">
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          </div>
        </div>
      ) : activeTournament ? (
        /* Real Tournament Card */
        <div className="flex flex-col justify-between flex-1 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-emerald-300 transition-all">
          <div>
            {/* Banner with Badge */}
            <div className="relative h-24 sm:h-28 w-full bg-slate-800 overflow-hidden">
              <img
                src={activeTournament.banner_url || activeTournament.logo_url || '/tournament_banner.png'}
                alt={activeTournament.name}
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
              <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">
                {activeTournament.name}
              </h3>

              <p className="text-xs font-bold text-slate-500">
                {activeTournament.tournament_format === 'league'
                  ? (isRtl ? 'دوري • نظام النقاط' : 'League • Round Robin')
                  : (isRtl ? 'بطولة مجموعات وإقصائيات' : 'Groups & Knockout')}
                {activeTournament.max_teams ? ` • ${activeTournament.max_teams} ${isRtl ? 'فرق' : 'teams'}` : ''}
              </p>

              {activeTournament.registration_deadline && (
                <p className="text-xs font-black text-rose-600">
                  {isRtl ? 'آخر موعد للتسجيل: ' : 'Registration deadline: '}
                  {new Date(activeTournament.registration_deadline).toLocaleDateString(isRtl ? 'ar-MA' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 pt-1 text-[11px] font-semibold text-slate-400">
                {activeTournament.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-slate-400" />
                    <span>
                      {new Date(activeTournament.start_date).toLocaleDateString(isRtl ? 'ar-MA' : 'en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </span>
                )}
                {(activeTournament.city || activeTournament.region) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-emerald-600" />
                    <span>{activeTournament.city || activeTournament.region}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="p-4 pt-0">
            <button
              type="button"
              onClick={() => navigate(activeTournament.slug ? `/tournaments/${activeTournament.slug}` : '/dashboard/tournaments')}
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-xs transition-colors"
            >
              {isRtl ? 'عرض تفاصيل البطولة' : 'View Tournament Details'}
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center flex-1 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-xs">
          <div className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 mb-2">
            <Trophy className="size-6" />
          </div>
          <h3 className="text-xs font-black text-slate-900">
            {isRtl ? 'لا توجد بطولات مفتوحة حالياً' : 'No open tournaments right now'}
          </h3>
          <p className="mt-1 text-[11px] font-semibold text-slate-400 max-w-xs">
            {isRtl
              ? 'تابع صفحة البطولات لمعرفة مواعيد فتح باب التسجيل في الدوريات والبطولات القادمة.'
              : 'Check the tournaments section to see upcoming league and tournament registrations.'}
          </p>
          <div className="mt-3 w-full">
            <Link
              to="/dashboard/tournaments"
              className="inline-flex items-center justify-center w-full rounded-xl border border-slate-200 hover:bg-slate-50 py-2 text-xs font-black text-slate-700 transition-colors"
            >
              <span>{isRtl ? 'تصفح كافة البطولات' : 'Browse All Tournaments'}</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
