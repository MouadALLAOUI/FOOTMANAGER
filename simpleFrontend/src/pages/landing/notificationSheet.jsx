import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  Swords,
  Trophy,
  UserPlus,
  Users,
  Star,
  MessageSquare,
  ShieldAlert,
  Megaphone,
  X,
  ChevronLeft,
  Loader2,
} from 'lucide-react'
import api from '../../api/client'
import { queryClient } from '../../api/queryClient'
import { useNotifications } from '../../api/queries'

/**
 * تنسيق التوقيت بنظام 24 ساعة بتوقيت المغرب الرسمي (Africa/Casablanca):
 * - اليوم: "اليوم 16:30"
 * - أمس: "أمس 14:15"
 * - غير ذلك: "27 أكتوبر 2026"
 */
export function formatMoroccoNotificationTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''

  const tz = 'Africa/Casablanca'
  const now = new Date()

  // صياغة التاريخ YYYY-MM-DD بتوقيت المغرب
  const dFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayStr = dFormat.format(now)

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayStr = dFormat.format(yesterday)

  const targetDateStr = dFormat.format(date)

  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const timeStr = timeFormatter.format(date)

  if (targetDateStr === todayStr) {
    return `اليوم ${timeStr}`
  } else if (targetDateStr === yesterdayStr) {
    return `أمس ${timeStr}`
  } else {
    const monthsAr = [
      'يناير',
      'فبراير',
      'مارس',
      'أبريل',
      'مايو',
      'يونيو',
      'يوليو',
      'أغسطس',
      'سبتمبر',
      'أكتوبر',
      'نوفمبر',
      'ديسمبر',
    ]
    const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, day: 'numeric' }).format(date)
    const monthIdx =
      parseInt(new Intl.DateTimeFormat('en-US', { timeZone: tz, month: 'numeric' }).format(date), 10) - 1
    const year = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric' }).format(date)
    return `${day} ${monthsAr[monthIdx] || ''} ${year}`
  }
}

/**
 * تجميع الإشعارات إلى مجموعتين: "اليوم" و "سابقاً"
 */
export function groupNotificationsByMoroccoDate(notifications = []) {
  const tz = 'Africa/Casablanca'
  const dFormat = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const todayStr = dFormat.format(new Date())

  const today = []
  const earlier = []

  notifications.forEach((n) => {
    if (!n.created_at) {
      earlier.push(n)
      return
    }
    const nDate = new Date(n.created_at)
    if (isNaN(nDate.getTime())) {
      earlier.push(n)
      return
    }
    const nDateStr = dFormat.format(nDate)
    if (nDateStr === todayStr) {
      today.push(n)
    } else {
      earlier.push(n)
    }
  })

  return { today, earlier }
}

/**
 * توجيه المسار إلى الصفحة المعنية بالمنصة
 */
export function resolveActionUrl(actionUrl, type) {
  if (actionUrl && typeof actionUrl === 'string' && actionUrl.trim() !== '') {
    const trimmed = actionUrl.trim()
    if (trimmed.startsWith('/')) {
      if (trimmed === '/dashboard/my-reservations' || trimmed === '/dashboard/bookings') {
        return '/dashboard'
      }
      return trimmed
    }
    try {
      const parsed = new URL(trimmed)
      return parsed.pathname + parsed.search
    } catch {
      return trimmed
    }
  }

  // مسار افتراضي حسب نوع الإشعار
  if (type?.startsWith('match_') || type?.startsWith('challenge_')) return '/challenges'
  if (type?.startsWith('booking_') || type?.startsWith('reservation_')) return '/fields'
  if (type?.startsWith('tournament_')) return '/tournaments'
  if (type?.startsWith('player_')) return '/players'
  return '/dashboard'
}

/**
 * تحديد الأيقونة واللون المناسب لنوع الإشعار
 */
export function getNotificationVisual(type = '') {
  if (type.includes('rejected') || type.includes('declined') || type.includes('cancellation')) {
    return {
      icon: XCircle,
      bg: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
    }
  }
  if (type.includes('approved') || type.includes('confirmed') || type.includes('accepted')) {
    return {
      icon: CheckCircle2,
      bg: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    }
  }
  if (type.startsWith('booking_') || type.startsWith('reservation_')) {
    return {
      icon: Calendar,
      bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    }
  }
  if (type.startsWith('challenge_') || type.startsWith('match_')) {
    return {
      icon: Swords,
      bg: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    }
  }
  if (type.startsWith('goal_') || type.startsWith('score_') || type.startsWith('tournament_')) {
    return {
      icon: Trophy,
      bg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    }
  }
  if (type.startsWith('player_') || type.startsWith('recruitment_')) {
    return {
      icon: UserPlus,
      bg: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    }
  }
  if (type.startsWith('team_')) {
    return {
      icon: Users,
      bg: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
    }
  }
  if (type.includes('mvp') || type.includes('review') || type.includes('star')) {
    return {
      icon: Star,
      bg: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    }
  }
  if (type.includes('comment') || type.includes('reply')) {
    return {
      icon: MessageSquare,
      bg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
    }
  }
  if (type.includes('announcement')) {
    return {
      icon: Megaphone,
      bg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
    }
  }
  if (type.includes('report')) {
    return {
      icon: ShieldAlert,
      bg: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
    }
  }
  return {
    icon: Bell,
    bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  }
}

export default function NotificationSheet({
  isOpen,
  onClose,
  isDark = true,
  unreadCount = 0,
}) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [accumulated, setAccumulated] = useState([])
  const [localReadIds, setLocalReadIds] = useState(new Set())
  const [markingAll, setMarkingAll] = useState(false)
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // استعلام React Query لإشعارات المستخدم
  const { data, isLoading, isFetching } = useNotifications(
    { page },
    {
      enabled: Boolean(isOpen),
      staleTime: 30_000,
      refetchInterval: isOpen ? 60_000 : false,
    }
  )

  // مزامنة الإشعارات الواردة
  useEffect(() => {
    if (data?.notifications) {
      if (page === 1) {
        setAccumulated(data.notifications)
      } else {
        setAccumulated((prev) => {
          const existingIds = new Set(prev.map((item) => item.id))
          const fresh = data.notifications.filter((item) => !existingIds.has(item.id))
          return [...prev, ...fresh]
        })
      }
    }
  }, [data, page])

  const hasMore = Boolean(data?.has_more)
  const currentItems = accumulated.length > 0 ? accumulated : (data?.notifications || [])

  // دمج حالة القراءة اللحظية
  const notifications = currentItems.map((n) => ({
    ...n,
    is_read: n.is_read || localReadIds.has(n.id) || markingAll,
  }))

  const activeUnread = notifications.filter((n) => !n.is_read).length

  // تحميل المزيد
  const handleLoadMore = () => {
    if (isFetching || !hasMore) return
    setPage((prev) => prev + 1)
  }

  // تعليم الكل كمقروء
  const handleMarkAllRead = async () => {
    if (markingAll) return
    setMarkingAll(true)
    setLocalReadIds(new Set(currentItems.map((n) => n.id)))

    try {
      await api.put('/notifications/read-all')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch {
      try {
        await api.post('/notifications/mark-all-read')
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      } catch {}
    } finally {
      setMarkingAll(false)
    }
  }

  // النقر على إشعار محدد
  const handleItemClick = async (notif) => {
    const targetUrl = resolveActionUrl(notif.action_url, notif.type)

    if (!notif.is_read) {
      setLocalReadIds((prev) => new Set([...prev, notif.id]))
      try {
        await api.put(`/notifications/${notif.id}/read`)
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      } catch {
        try {
          await api.patch(`/notifications/${notif.id}/read`)
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        } catch {}
      }
    }

    onClose()
    if (targetUrl) {
      navigate(targetUrl)
    }
  }

  if (!isOpen) return null

  const { today, earlier } = groupNotificationsByMoroccoDate(notifications)
  const hasNotifications = notifications.length > 0
  const isInitialLoading = isLoading && !data

  const content = (
    <>
      {/* خلفية معتمة للنقر في الخارج وإغلاق القائمة */}
      <div
        className="fixed inset-0 z-[var(--z-overlay)] bg-black/60 backdrop-blur-xs transition-opacity sm:bg-transparent sm:backdrop-blur-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* الحاوية: نافذة سفلية منزلقة على الجوال (< sm)، وقائمة منسدلة أنيقة على الشاشات الكبيرة (>= sm) */}
      <div
        role="dialog"
        aria-label="قائمة التنبيهات والإشعارات"
        className={`fixed inset-x-0 bottom-0 z-[var(--z-modal)] flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[28px] border-t shadow-2xl transition-all sm:absolute sm:inset-auto sm:end-0 sm:top-14 sm:max-h-[520px] sm:w-[380px] sm:rounded-3xl sm:border sm:shadow-2xl ${
          isDark
            ? 'border-emerald-900/50 bg-[#14221C] text-white shadow-black/80'
            : 'border-slate-200 bg-white text-slate-900 shadow-xl'
        }`}
      >
        {/* مقبض السحب للجوال */}
        <div className="flex sm:hidden w-full justify-center pt-2.5 pb-1">
          <div className="h-1 w-12 rounded-full bg-slate-500/30" />
        </div>

        {/* ترويسة القائمة */}
        <div
          className={`flex items-center justify-between border-b px-4 py-3 sm:px-5 ${
            isDark ? 'border-emerald-900/40 bg-[#14221C]/80' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black tracking-tight">الإشعارات</h2>
            {activeUnread > 0 && (
              <span
                className="grid min-w-[20px] h-5 place-items-center rounded-full px-1.5 text-[10px] font-black text-white shadow-xs"
                style={{ backgroundColor: '#B53E5B' }}
              >
                {activeUnread > 9 ? '9+' : activeUnread}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeUnread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 transition-colors cursor-pointer"
              >
                <CheckCheck className="size-3.5" />
                <span>تعليم الكل كمقروء</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق الإشعارات"
              className={`grid size-7 place-items-center rounded-xl transition-colors sm:hidden ${
                isDark ? 'text-slate-400 hover:bg-emerald-900/30 hover:text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* جسم الإشعارات */}
        <div className="flex-1 overflow-y-auto divide-y divide-emerald-900/20 overscroll-contain">
          {isInitialLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-slate-400">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
              <p className="text-xs font-bold">جاري تحميل الإشعارات...</p>
            </div>
          ) : !hasNotifications ? (
            /* حالة الفراغ: ما عندك حتى إشعار دابا */
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <div
                className={`grid size-14 place-items-center rounded-2xl ${
                  isDark ? 'bg-emerald-950/40 text-emerald-500/70 border border-emerald-900/30' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <BellOff className="size-7" />
              </div>
              <div className="space-y-1">
                <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  ما عندك حتى إشعار دابا.
                </p>
                <p className="text-[11px] text-slate-400 max-w-[240px] leading-relaxed">
                  أي جديد على مبارياتك وتحدياتك وحجوزات الملاعب غادي يوصلك هنا مباشرة.
                </p>
              </div>
            </div>
          ) : (
            <div className="pb-4">
              {/* قسم: اليوم */}
              {today.length > 0 && (
                <div className="pt-2">
                  <div className="flex items-center justify-between px-4 py-1.5 text-[11px] font-black text-emerald-400">
                    <span>اليوم</span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {today.length} إشعار
                    </span>
                  </div>
                  <div className="divide-y divide-emerald-900/10">
                    {today.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        isDark={isDark}
                        onClick={() => handleItemClick(n)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* قسم: سابقاً */}
              {earlier.length > 0 && (
                <div className="pt-2">
                  <div
                    className={`flex items-center justify-between px-4 py-1.5 text-[11px] font-black ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <span>سابقًا</span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {earlier.length} إشعار
                    </span>
                  </div>
                  <div className="divide-y divide-emerald-900/10">
                    {earlier.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        isDark={isDark}
                        onClick={() => handleItemClick(n)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* زر ترقيم الصفحات / تحميل المزيد */}
              {hasMore && (
                <div className="p-3 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isFetching}
                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                      isDark
                        ? 'bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-800/40'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isFetching ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>جاري التحميل...</span>
                      </>
                    ) : (
                      <span>عرض المزيد من الإشعارات</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )

  if (isMobile && typeof document !== 'undefined') {
    return createPortal(content, document.body)
  }

  return content
}

/**
 * مكوّن سطر الإشعار الفردي
 */
function NotificationRow({ notification, isDark, onClick }) {
  const n = notification
  const { icon: Icon, bg: iconBg } = getNotificationVisual(n.type)
  const formattedTime = formatMoroccoNotificationTime(n.created_at)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-start gap-3 p-3.5 text-start transition-colors cursor-pointer ${
        n.is_read
          ? isDark
            ? 'hover:bg-emerald-950/20'
            : 'hover:bg-slate-50'
          : isDark
          ? 'bg-emerald-950/30 hover:bg-emerald-950/50'
          : 'bg-emerald-50/60 hover:bg-emerald-50'
      }`}
    >
      {/* الأيقونة المعبرة */}
      <div className={`grid size-10 shrink-0 place-items-center rounded-2xl ${iconBg}`}>
        <Icon className="size-4.5" />
      </div>

      {/* المحتوى */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`truncate text-xs font-extrabold ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {n.title}
          </p>

          {/* نقطة تمييز غير المقروء الخضراء #1F7A4D */}
          {!n.is_read && (
            <span
              className="size-2 shrink-0 rounded-full shadow-xs"
              style={{ backgroundColor: '#1F7A4D' }}
              title="غير مقروء"
            />
          )}
        </div>

        {n.body && (
          <p
            className={`mt-0.5 text-[11px] leading-relaxed line-clamp-2 ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {n.body}
          </p>
        )}

        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400">
            {formattedTime}
          </span>
          <ChevronLeft
            className={`size-3.5 opacity-0 transition-opacity group-hover:opacity-100 ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}
          />
        </div>
      </div>
    </button>
  )
}
