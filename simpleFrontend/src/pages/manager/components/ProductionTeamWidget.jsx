import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Shield } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import TeamLogo from '../../../components/profile/TeamLogo'

export default function ProductionTeamWidget() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { team, players } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const teamName = team?.name || (isRtl ? 'أجيال أيت لحسن أوبويزيد' : 'Ajyal Ait Lahcen')
  const playerCount = team?.member_count || players?.length || 12
  const matchesCount = team?.matches_played || 8
  const winsCount = team?.wins || 6

  // Form history: Wins (ف), Draws (ت), Losses (خ)
  const formPills = [
    { text: isRtl ? 'ف' : 'W', bg: 'bg-emerald-500' },
    { text: isRtl ? 'ف' : 'W', bg: 'bg-emerald-500' },
    { text: isRtl ? 'ت' : 'D', bg: 'bg-amber-500' },
    { text: isRtl ? 'خ' : 'L', bg: 'bg-rose-500' },
    { text: isRtl ? 'ف' : 'W', bg: 'bg-emerald-500' },
  ]

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
              {isRtl ? 'مسير فريق • قسم الهواة' : 'Team Manager • Amateur League'}
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

          {/* Form Guide */}
          <div className="mt-4 text-center">
            <p className="text-[11px] font-bold text-slate-500 mb-2">
              {isRtl ? 'آخر 5 مباريات' : 'Last 5 matches'}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              {formPills.map((p, i) => (
                <span
                  key={i}
                  className={`grid size-6 place-items-center rounded-full text-[10px] font-black text-white shadow-2xs ${p.bg}`}
                >
                  {p.text}
                </span>
              ))}
            </div>
          </div>
        </div>

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
