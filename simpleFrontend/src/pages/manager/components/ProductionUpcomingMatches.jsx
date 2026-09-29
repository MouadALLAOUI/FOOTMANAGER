import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, MapPin, ArrowLeft, ArrowRight, CalendarX2, Plus } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import TeamLogo from '../../../components/profile/TeamLogo'
import { Skeleton } from '../../../components/dashboard/ui'

export default function ProductionUpcomingMatches() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { upcoming, team, setMatch, loadingBy, openCreate } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const isLoading = loadingBy?.requests
  const matches = (upcoming || []).slice(0, 3)

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <CalendarDays className="size-3.5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {isRtl ? 'المباريات القادمة' : 'Upcoming Matches'}
          </h2>
        </div>

        <Link
          to="/dashboard/matches"
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <span>{isRtl ? 'عرض الكل' : 'View all'}</span>
          <ArrowIcon className="size-3.5" />
        </Link>
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
              <div className="flex justify-center pb-2">
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <div className="flex items-center justify-between gap-2 py-3 px-1">
                <div className="flex flex-col items-center flex-1">
                  <Skeleton className="size-12 rounded-2xl" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
                <Skeleton className="size-7 rounded-full" />
                <div className="flex flex-col items-center flex-1">
                  <Skeleton className="size-12 rounded-2xl" />
                  <Skeleton className="mt-2 h-3 w-16" />
                </div>
              </div>
              <div className="space-y-1.5 py-2 border-t border-slate-100">
                <Skeleton className="h-3 w-28 mx-auto" />
                <Skeleton className="h-3 w-20 mx-auto" />
              </div>
              <div className="pt-2">
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && matches.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-xs">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
            <CalendarX2 className="size-6" />
          </div>
          <h3 className="text-sm font-black text-slate-900">
            {isRtl ? 'لا توجد مباريات قادمة مبرمجة' : 'No upcoming matches scheduled'}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-500 max-w-sm">
            {isRtl
              ? 'لم تقم ببرمجة أي مباراة بعد. يمكنك إنشاء مباراة ودية جديدة أو استكشاف طلبات الفرق الأخرى.'
              : 'You have no scheduled matches yet. You can create a new friendly match or challenge other teams.'}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-black text-white shadow-xs transition-colors"
            >
              <Plus className="size-3.5" />
              <span>{isRtl ? 'إنشاء مباراة ودية' : 'Create Match'}</span>
            </button>
            <Link
              to="/dashboard/feed"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 transition-colors"
            >
              <span>{isRtl ? 'استكشاف التحديات' : 'Browse Challenges'}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Real Matches Grid */}
      {!isLoading && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {matches.map((m) => {
            const oppName = m.opponent_team?.name || m.host_team?.name || (isRtl ? 'فريق منافس' : 'Opponent')
            const myName = team?.name || (isRtl ? 'فريقي' : 'My Team')
            const stadiumName = m.stadium?.name || m.custom_terrain_name || (isRtl ? 'ملعب محلي' : 'Local Stadium')
            const matchDate = m.match_datetime
              ? new Date(m.match_datetime).toLocaleDateString(isRtl ? 'ar-MA' : 'en-US', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })
              : '—'
            const matchTime = m.match_datetime
              ? new Date(m.match_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'

            return (
              <div
                key={m.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                {/* Badge */}
                <div className="flex justify-center pb-2">
                  <span
                    className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-black ${
                      m.tournament_id || m.type === 'tournament'
                        ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                        : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                    }`}
                  >
                    {m.tournament_id || m.type === 'tournament'
                      ? (isRtl ? 'مباراة بطولة' : 'Tournament Match')
                      : (isRtl ? 'مباراة ودية' : 'Friendly Match')}
                  </span>
                </div>

                {/* Matchup Crests & VS */}
                <div className="flex items-center justify-between gap-2 py-3 px-1">
                  {/* Team 1 */}
                  <div className="flex flex-col items-center flex-1 text-center min-w-0">
                    <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 p-1 shadow-xs border border-slate-200/70">
                      <TeamLogo team={team} name={myName} className="size-10" rounded="rounded-xl" fontSize="text-sm" />
                    </div>
                    <span className="mt-2 text-xs font-black text-slate-800 line-clamp-1 w-full">
                      {myName}
                    </span>
                  </div>

                  {/* VS Badge */}
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500 border border-slate-200">
                    VS
                  </div>

                  {/* Team 2 */}
                  <div className="flex flex-col items-center flex-1 text-center min-w-0">
                    <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 p-1 shadow-xs border border-slate-200/70">
                      <TeamLogo team={m.opponent_team || m.host_team} name={oppName} className="size-10" rounded="rounded-xl" fontSize="text-sm" />
                    </div>
                    <span className="mt-2 text-xs font-black text-slate-800 line-clamp-1 w-full">
                      {oppName}
                    </span>
                  </div>
                </div>

                {/* Date & Location */}
                <div className="space-y-1 py-2 text-center border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                  <p className="flex items-center justify-center gap-1">
                    <span>{matchDate}</span>
                  </p>
                  <p className="flex items-center justify-center gap-1 font-bold text-slate-700">
                    <Clock className="size-3 text-slate-400" />
                    <span>{matchTime}</span>
                  </p>
                  <p className="flex items-center justify-center gap-1 text-slate-500">
                    <MapPin className="size-3 text-emerald-600" />
                    <span className="truncate max-w-[170px]">{stadiumName}</span>
                  </p>
                </div>

                {/* View Details Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setMatch(m)}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-xs transition-colors"
                  >
                    {isRtl ? 'عرض التفاصيل' : 'View Details'}
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
