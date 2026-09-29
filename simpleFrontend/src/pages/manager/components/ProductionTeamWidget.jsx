import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Shield } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import TeamLogo from '../../../components/profile/TeamLogo'
import { Skeleton } from '../../../components/dashboard/ui'

export default function ProductionTeamWidget() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { team, players, loadingBy } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const isLoading = loadingBy?.team

  const teamName = team?.name || (isRtl ? 'فريقي' : 'My Team')
  const playerCount = players?.length || team?.member_count || 0
  const matchesCount = Number(team?.matches_played ?? 0)
  const winsCount = Number(team?.wins ?? 0)
  const drawsCount = Number(team?.draws ?? 0)
  const lossesCount = Number(team?.losses ?? 0)

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900">
          {isRtl ? 'فريقي' : 'My Team'}
        </h2>

        <Link
          to="/dashboard/team"
          className="text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          {isRtl ? 'عرض الكل' : 'View all'}
        </Link>
      </div>

      {/* Team Card */}
      <div className="flex flex-col justify-between flex-1 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-4 space-y-4">
            <Skeleton className="size-16 rounded-2xl" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <div className="w-full grid grid-cols-3 gap-2 py-4">
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
              <Skeleton className="h-10 rounded-xl" />
            </div>
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ) : (
          <div>
            {/* Logo & Name */}
            <div className="flex flex-col items-center text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-slate-50 p-2 shadow-xs border border-slate-200">
                <TeamLogo team={team} name={teamName} className="size-12" rounded="rounded-xl" fontSize="text-xl" />
              </div>

              <h3 className="mt-3 text-base font-black text-slate-900 line-clamp-1">
                {teamName}
              </h3>

              <p className="mt-0.5 text-xs font-semibold text-slate-500">
                {team?.association_name || (isRtl ? 'مسير فريق' : 'Team Manager')}
              </p>
            </div>

            {/* 3 Stats Columns */}
            <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 py-3 text-center rtl:divide-x-reverse">
              <div>
                <p className="text-lg font-black text-slate-900">{playerCount}</p>
                <p className="text-[11px] font-bold text-slate-400">{isRtl ? 'لاعبين' : 'Players'}</p>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{matchesCount}</p>
                <p className="text-[11px] font-bold text-slate-400">{isRtl ? 'مباريات' : 'Matches'}</p>
              </div>
              <div>
                <p className="text-lg font-black text-slate-900">{winsCount}</p>
                <p className="text-[11px] font-bold text-slate-400">{isRtl ? 'انتصارات' : 'Wins'}</p>
              </div>
            </div>

            {/* Record / Form Section */}
            <div className="mt-4 text-center">
              <p className="text-[11px] font-bold text-slate-500 mb-2">
                {isRtl ? 'سجل الفريق' : 'Team Record'}
              </p>
              {matchesCount > 0 ? (
                <div className="flex items-center justify-center gap-2 text-xs font-black">
                  <span className="rounded-lg bg-emerald-50 text-emerald-700 px-2 py-0.5 ring-1 ring-emerald-200">
                    {winsCount} {isRtl ? 'فوز' : 'W'}
                  </span>
                  <span className="rounded-lg bg-amber-50 text-amber-700 px-2 py-0.5 ring-1 ring-amber-200">
                    {drawsCount} {isRtl ? 'تعادل' : 'D'}
                  </span>
                  <span className="rounded-lg bg-rose-50 text-rose-700 px-2 py-0.5 ring-1 ring-rose-200">
                    {lossesCount} {isRtl ? 'هزيمة' : 'L'}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] font-semibold text-slate-400">
                  {isRtl ? 'لا توجد مباريات مسجلة بعد' : 'No recorded matches yet'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 pt-2">
          <button
            type="button"
            onClick={() => navigate('/dashboard/team')}
            className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-emerald-600 hover:bg-emerald-50 py-2.5 text-xs font-black text-emerald-700 transition-colors"
          >
            <span>{isRtl ? 'إدارة الفريق' : 'Manage Team'}</span>
            <ArrowIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
