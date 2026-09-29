import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Clock, CalendarCheck, ArrowLeft, ArrowRight, Bell } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import { Skeleton } from '../../../components/dashboard/ui'

export default function ProductionRecentActivity() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { notifs, loadingBy } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  const isLoading = loadingBy?.notifs
  const activities = (notifs || []).slice(0, 4).map((n) => ({
    id: n.id,
    title: n.title || n.data?.title || (isRtl ? 'إشعار جديد' : 'Notification'),
    desc: n.body || n.data?.body || n.data?.message || '',
    time: n.created_at ? new Date(n.created_at).toLocaleDateString(isRtl ? 'ar-MA' : 'en-US') : '',
    icon: CalendarCheck,
    bg: 'bg-emerald-100 text-emerald-700',
  }))

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
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
            <div className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-400 mb-2">
              <Bell className="size-5" />
            </div>
            <p className="text-xs font-black text-slate-700">
              {isRtl ? 'لا توجد أنشطة جديدة' : 'No recent activity'}
            </p>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              {isRtl ? 'ستظهر هنا إشعارات المباريات والحجوزات الجديدة.' : 'New notifications and match updates will appear here.'}
            </p>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  )
}
