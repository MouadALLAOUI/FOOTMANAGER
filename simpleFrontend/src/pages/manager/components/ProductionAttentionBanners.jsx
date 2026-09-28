import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronRight, ChevronLeft, Download, Shield, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import { formatDate } from './shared'

export default function ProductionAttentionBanners() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { nextMatch, requests, setMatch } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight

  // Find incoming challenge or pending request if available
  const pendingChallenge = requests?.find((r) => r.status === 'open' || r.status === 'pending')

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-lg bg-rose-100 text-rose-600">
            <Sparkles className="size-3.5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {isRtl ? 'يحتاج انتباهك' : 'Needs your attention'}
          </h2>
        </div>

        <Link
          to="/dashboard/notifications"
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <span>{isRtl ? 'عرض الكل' : 'View all'}</span>
          <ArrowIcon className="size-3.5" />
        </Link>
      </div>

      {/* 3 Alert Cards (Stacked on Mobile, 3 Columns on Desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Alert 1: Upcoming Match */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-rose-100/90 bg-rose-50/50 p-4 transition-all hover:bg-rose-50/80 hover:shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600">
                <Calendar className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-rose-600 block">
                  {isRtl ? 'مباراة قريبة' : 'Upcoming Match'}
                </span>
                <p className="mt-0.5 text-xs font-black text-slate-800 line-clamp-1">
                  {nextMatch
                    ? (isRtl ? `مباراة ضد ${nextMatch.opponent_team?.name || nextMatch.host_team?.name || 'الخصم'}` : `Match vs ${nextMatch.opponent_team?.name || 'Opponent'}`)
                    : (isRtl ? 'مباراة ضد شباب المدينة' : 'Match vs Shabab Al Madina')}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {nextMatch?.match_datetime
                    ? formatDate(nextMatch.match_datetime)
                    : (isRtl ? 'السبت 28 شتنبر • 18:00' : 'Saturday 28 Sep • 18:00')}
                </p>
              </div>
            </div>
            <ChevronIcon className="size-4 text-rose-400 shrink-0 mt-1" />
          </div>

          <div className="mt-3 pt-2">
            <button
              type="button"
              onClick={() => {
                if (nextMatch) setMatch(nextMatch)
                else navigate('/dashboard/matches')
              }}
              className="w-full rounded-xl bg-rose-100/80 hover:bg-rose-200/80 py-1.5 text-xs font-black text-rose-700 transition-colors"
            >
              {isRtl ? 'عرض التفاصيل' : 'View Details'}
            </button>
          </div>
        </div>

        {/* Alert 2: New Challenge Request */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-amber-100/90 bg-amber-50/50 p-4 transition-all hover:bg-amber-50/80 hover:shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <Download className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-amber-700 block">
                  {isRtl ? 'طلب تحدي جديد' : 'New Challenge Request'}
                </span>
                <p className="mt-0.5 text-xs font-black text-slate-800 line-clamp-1">
                  {isRtl
                    ? (pendingChallenge?.host_team?.name ? `فريق ${pendingChallenge.host_team.name} يرغب في مواجهتك` : 'فريق نجوم السلام يرغب في مواجهة فريقك')
                    : 'Noujoum Salam team wants to challenge you'}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isRtl ? 'بانتظار موافقتك' : 'Awaiting your confirmation'}
                </p>
              </div>
            </div>
            <ChevronIcon className="size-4 text-amber-500 shrink-0 mt-1" />
          </div>

          <div className="mt-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard/feed')}
              className="w-full rounded-xl bg-amber-100/80 hover:bg-amber-200/80 py-1.5 text-xs font-black text-amber-800 transition-colors"
            >
              {isRtl ? 'مشاهدة الطلب' : 'View Request'}
            </button>
          </div>
        </div>

        {/* Alert 3: Tournament Registration */}
        <div className="relative flex flex-col justify-between rounded-2xl border border-sky-100/90 bg-sky-50/50 p-4 transition-all hover:bg-sky-50/80 hover:shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700">
                <Shield className="size-5" />
              </div>
              <div>
                <span className="text-[11px] font-black text-sky-700 block">
                  {isRtl ? 'التسجيل في بطولة' : 'Tournament Registration'}
                </span>
                <p className="mt-0.5 text-xs font-black text-slate-800 line-clamp-1">
                  {isRtl ? 'الدوري المحلي 2024' : 'Local League 2024'}
                </p>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  {isRtl ? 'ينتهي التسجيل بعد 5 أيام' : 'Registration ends in 5 days'}
                </p>
              </div>
            </div>
            <ChevronIcon className="size-4 text-sky-400 shrink-0 mt-1" />
          </div>

          <div className="mt-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard/tournaments')}
              className="w-full rounded-xl bg-sky-100/80 hover:bg-sky-200/80 py-1.5 text-xs font-black text-sky-800 transition-colors"
            >
              {isRtl ? 'عرض البطولة' : 'View Tournament'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
