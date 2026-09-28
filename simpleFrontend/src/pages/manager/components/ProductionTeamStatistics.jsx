import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, ArrowLeft, ArrowRight } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'

export default function ProductionTeamStatistics() {
  const { t, i18n } = useTranslation()
  const { team } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const matches = team?.matches_played || 8
  const wins = team?.wins || 6
  const goalsFor = team?.goals_for || 18
  const goalsAgainst = team?.goals_against || 7

  const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 75
  const avgScored = matches > 0 ? (goalsFor / matches).toFixed(1) : '2.3'
  const avgConceded = matches > 0 ? (goalsAgainst / matches).toFixed(1) : '0.9'

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <BarChart3 className="size-3.5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {isRtl ? 'إحصائيات الفريق' : 'Team Statistics'}
          </h2>
        </div>

        <Link
          to="/dashboard/analytics"
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <span>{isRtl ? 'عرض الكل' : 'View all'}</span>
          <ArrowIcon className="size-3.5" />
        </Link>
      </div>

      {/* 4 Stats Columns Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs rtl:md:divide-x-reverse">
        {/* Metric 1: Matches */}
        <div className="flex flex-col items-center justify-center p-3 text-center">
          <span className="text-xs font-bold text-slate-400">
            {isRtl ? 'المباريات' : 'Matches'}
          </span>
          <p className="mt-1 text-3xl font-black text-slate-900">{matches}</p>
          <span className="mt-1 text-[11px] font-bold text-emerald-600">
            {isRtl ? '+2 هذا الشهر' : '+2 this month'}
          </span>
        </div>

        {/* Metric 2: Wins with Radial Progress */}
        <div className="flex flex-col items-center justify-center p-3 text-center">
          <span className="text-xs font-bold text-slate-400">
            {isRtl ? 'الانتصارات' : 'Wins'}
          </span>
          <div className="mt-2 flex items-center gap-3">
            <p className="text-3xl font-black text-slate-900">{wins}</p>

            {/* Circular Progress Gauge */}
            <div className="relative grid size-12 place-items-center">
              <svg className="size-12 -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  className="stroke-slate-100"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  className="stroke-emerald-500"
                  strokeWidth="4"
                  strokeDasharray={113}
                  strokeDashoffset={113 - (113 * winRate) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-emerald-700">
                {winRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Goals Scored */}
        <div className="flex flex-col items-center justify-center p-3 text-center">
          <span className="text-xs font-bold text-slate-400">
            {isRtl ? 'الأهداف المسجلة' : 'Goals Scored'}
          </span>
          <p className="mt-1 text-3xl font-black text-slate-900">{goalsFor}</p>
          <span className="mt-1 text-[11px] font-semibold text-slate-400">
            {avgScored} {isRtl ? 'في المباراة' : 'per match'}
          </span>
        </div>

        {/* Metric 4: Goals Conceded */}
        <div className="flex flex-col items-center justify-center p-3 text-center">
          <span className="text-xs font-bold text-slate-400">
            {isRtl ? 'الأهداف المستقبلة' : 'Goals Conceded'}
          </span>
          <p className="mt-1 text-3xl font-black text-slate-900">{goalsAgainst}</p>
          <span className="mt-1 text-[11px] font-semibold text-slate-400">
            {avgConceded} {isRtl ? 'في المباراة' : 'per match'}
          </span>
        </div>
      </div>
    </div>
  )
}
