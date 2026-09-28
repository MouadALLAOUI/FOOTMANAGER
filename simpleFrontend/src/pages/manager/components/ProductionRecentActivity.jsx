import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, CalendarCheck, Swords, Users, Trophy, ArrowLeft, ArrowRight } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'

export default function ProductionRecentActivity() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { notifs } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const activities = notifs && notifs.length > 0 ? notifs.slice(0, 4).map((n) => ({
    id: n.id,
    title: n.title,
    desc: n.body,
    time: n.created_at ? new Date(n.created_at).toLocaleDateString(isRtl ? 'ar-MA' : 'en-US') : (isRtl ? 'منذ فترة' : 'Recently'),
    icon: CalendarCheck,
    bg: 'bg-emerald-100 text-emerald-700',
  })) : [
    {
      id: 1,
      title: isRtl ? 'تم قبول طلبك للحجز' : 'Booking request approved',
      desc: isRtl ? 'ملعب الحي المحمدي • السبت 28 شتنبر' : 'Hay Mohammadi • Sat 28 Sep',
      icon: CalendarCheck,
      bg: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 2,
      title: isRtl ? 'تلقيت تحدي جديد' : 'New challenge received',
      desc: isRtl ? 'من فريق نجوم السلام • منذ ساعتين' : 'From Noujoum Salam • 2h ago',
      icon: Swords,
      bg: 'bg-rose-100 text-rose-600',
    },
    {
      id: 3,
      title: isRtl ? 'اكتمال تسجيل الفريق' : 'Team registration complete',
      desc: isRtl ? 'تم إضافة 3 لاعبين جدد • منذ يوم' : '3 new players added • 1d ago',
      icon: Users,
      bg: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 4,
      title: isRtl ? 'تم التسجيل في بطولة' : 'Registered in tournament',
      desc: isRtl ? 'الدوري المحلي 2024 • منذ يومين' : 'Local League 2024 • 2d ago',
      icon: Trophy,
      bg: 'bg-amber-100 text-amber-700',
    },
  ]

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <Clock className="size-3.5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {isRtl ? 'النشاط الأخير' : 'Recent Activity'}
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

      {/* Activity List Card */}
      <div className="flex flex-col justify-between flex-1 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="space-y-3">
          {activities.map((act) => {
            const Icon = act.icon || CalendarCheck
            return (
              <div key={act.id} className="flex items-center gap-3">
                <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${act.bg}`}>
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-800 truncate">
                    {act.title}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-400 truncate">
                    {act.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
