import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronRight, ChevronLeft, Download, Shield, Sparkles, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import { formatDate } from './shared'

export default function ProductionAttentionBanners() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { nextMatch, requests, tournaments, setMatch, myTeamId } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight
  const ChevronIcon = isRtl ? ChevronLeft : ChevronRight

  // Find incoming challenge or pending request if available
  const pendingChallenge = requests?.find(
    (r) => (r.status === 'open' && r.host_team_id !== myTeamId) || r.status === 'pending',
  )
  const openTournament = tournaments && tournaments.length > 0 ? tournaments[0] : null

  // Active alerts list
  const alerts = []

  if (nextMatch) {
    const oppName = nextMatch.opponent_team?.name || nextMatch.host_team?.name || (isRtl ? 'الخصم' : 'Opponent')
    alerts.push({
      id: 'match',
      type: 'rose',
      icon: Calendar,
      title: isRtl ? 'مباراة قريبة' : 'Upcoming Match',
      desc: isRtl ? `مباراة ضد ${oppName}` : `Match vs ${oppName}`,
      sub: nextMatch.match_datetime ? formatDate(nextMatch.match_datetime) : '',
      actionText: isRtl ? 'عرض التفاصيل' : 'View Details',
      action: () => setMatch(nextMatch),
    })
  }

  if (pendingChallenge) {
    const challengerName = pendingChallenge.host_team?.name || (isRtl ? 'فريق رياضي' : 'Opponent Team')
    alerts.push({
      id: 'challenge',
      type: 'amber',
      icon: Download,
      title: isRtl ? 'طلب تحدي متاح' : 'Challenge Request',
      desc: isRtl ? `طلب مباراة من ${challengerName}` : `Match request from ${challengerName}`,
      sub: isRtl ? 'بانتظار التأكيد' : 'Awaiting confirmation',
      actionText: isRtl ? 'مشاهدة الطلب' : 'View Request',
      action: () => navigate('/dashboard/feed'),
    })
  }

  if (openTournament) {
    alerts.push({
      id: 'tournament',
      type: 'sky',
      icon: Shield,
      title: isRtl ? 'التسجيل في بطولة' : 'Tournament Registration',
      desc: openTournament.name,
      sub: openTournament.registration_deadline
        ? (isRtl ? `آخر أجل: ${new Date(openTournament.registration_deadline).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })}` : `Deadline: ${new Date(openTournament.registration_deadline).toLocaleDateString()}`)
        : (isRtl ? 'باب التسجيل مفتوح' : 'Registration Open'),
      actionText: isRtl ? 'عرض البطولة' : 'View Tournament',
      action: () => navigate(openTournament.slug ? `/tournaments/${openTournament.slug}` : '/dashboard/tournaments'),
    })
  }

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

      {alerts.length === 0 ? (
        /* All clear clean state */
        <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800">
                {isRtl ? 'كل الأمور تحت السيطرة' : 'All clear'}
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                {isRtl ? 'لا توجد طلبات أو تنبيهات عاجلة تتطلب تدخلك الآن.' : 'No urgent alerts or pending requests right now.'}
              </p>
            </div>
          </div>
          <Link
            to="/dashboard/feed"
            className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-2xs transition-colors shrink-0"
          >
            {isRtl ? 'تحدي فريق جديد' : 'Challenge Team'}
          </Link>
        </div>
      ) : (
        /* Real Alert Cards Grid */
        <div className={`grid grid-cols-1 ${alerts.length === 2 ? 'md:grid-cols-2' : alerts.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-3.5`}>
          {alerts.map((al) => {
            const Icon = al.icon
            const colorClasses = {
              rose: {
                card: 'border-rose-100/90 bg-rose-50/50 hover:bg-rose-50/80',
                iconBg: 'bg-rose-100 text-rose-600',
                badge: 'text-rose-600',
                btn: 'bg-rose-100/80 hover:bg-rose-200/80 text-rose-700',
                chevron: 'text-rose-400',
              },
              amber: {
                card: 'border-amber-100/90 bg-amber-50/50 hover:bg-amber-50/80',
                iconBg: 'bg-amber-100 text-amber-700',
                badge: 'text-amber-700',
                btn: 'bg-amber-100/80 hover:bg-amber-200/80 text-amber-800',
                chevron: 'text-amber-500',
              },
              sky: {
                card: 'border-sky-100/90 bg-sky-50/50 hover:bg-sky-50/80',
                iconBg: 'bg-sky-100 text-sky-700',
                badge: 'text-sky-700',
                btn: 'bg-sky-100/80 hover:bg-sky-200/80 text-sky-800',
                chevron: 'text-sky-400',
              },
            }[al.type]

            return (
              <div
                key={al.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all hover:shadow-xs ${colorClasses.card}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${colorClasses.iconBg}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <span className={`text-[11px] font-black block ${colorClasses.badge}`}>
                        {al.title}
                      </span>
                      <p className="mt-0.5 text-xs font-black text-slate-800 line-clamp-1">
                        {al.desc}
                      </p>
                      {al.sub && (
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          {al.sub}
                        </p>
                      )}
                    </div>
                  </div>
                  <ChevronIcon className={`size-4 shrink-0 mt-1 ${colorClasses.chevron}`} />
                </div>

                <div className="mt-3 pt-2">
                  <button
                    type="button"
                    onClick={al.action}
                    className={`w-full rounded-xl py-1.5 text-xs font-black transition-colors ${colorClasses.btn}`}
                  >
                    {al.actionText}
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
