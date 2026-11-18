import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  Home,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Radio,
  Settings,
  Smartphone,
  Sun,
  Trophy,
  User,
  UserPlus,
  X,
  Zap,
} from 'lucide-react'
import { useAuth, homeForRole } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useNotificationUnreadCount } from '../../api/queries'
import { triggerPwaInstall, isStandalone } from './pwaHelper'

function getSettingsPath(role) {
  if (role === 'admin' || role === 'sub_admin') return '/admin/settings'
  if (role === 'terrain_owner') return '/terrain/settings'
  if (role === 'player') return '/player/settings'
  if (role === 'committee') return '/committee/settings'
  return '/dashboard/settings'
}

function getRoleLabel(role) {
  if (role === 'admin') return 'مدير المنصة'
  if (role === 'manager') return 'مسير فريق'
  if (role === 'committee') return 'لجنة تنظيمية'
  if (role === 'terrain_owner') return 'صاحب ملعب'
  return 'لاعب'
}

export default function SidebarNav({ isOpen, onClose, onOpenNotifications }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()

  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  // Notifications unread count
  const { data: unreadData } = useNotificationUnreadCount({
    refetchInterval: 60_000,
    enabled: Boolean(user),
  })
  const unread = unreadData?.unread_count || 0

  // Mount/unmount animation management
  useEffect(() => {
    if (isOpen) {
      setMounted(true)
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
      return () => cancelAnimationFrame(raf)
    }
    setVisible(false)
    const timer = setTimeout(() => setMounted(false), 300)
    return () => clearTimeout(timer)
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    if (!mounted) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mounted, onClose])

  // Lock body scroll while open
  useEffect(() => {
    if (!mounted) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [mounted])

  const handleNav = (to) => {
    onClose()
    if (!to) return
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    navigate(to)
  }

  const handleLogout = async () => {
    try {
      onClose()
      if (logout) await logout()
      navigate('/')
    } catch {}
  }

  if (!mounted || typeof document === 'undefined') return null

  // Check active navigation link
  const isItemActive = (to, exact = false) => {
    if (exact) return location.pathname === to
    return location.pathname.startsWith(to)
  }

  return createPortal(
    <div
      role="region"
      aria-label="القائمة الجانبية"
      className={`fixed inset-0 z-[var(--z-drawer)] transition-opacity duration-300 ${
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* 1. Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 2. Slide-in Drawer from Right in RTL (start-0) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الرئيسية"
        className={`fixed inset-y-0 start-0 flex h-[100dvh] w-[82vw] max-w-[340px] sm:w-80 flex-col bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2] shadow-2xl transition-transform duration-300 ease-out select-none border-e border-[#E1E5DF] dark:border-[#303832] ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Dark Green Premium Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0D2418] to-[#08170F] text-white p-4.5 pt-[calc(1.125rem+var(--safe-top-offset,0px))] border-b border-[#179955]/30">
          {/* Subtle Glow */}
          <div
            className="absolute -end-10 -top-10 size-32 rounded-full bg-[#B8F000]/15 blur-2xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2.5 group"
              aria-label="الصفحة الرئيسية - أجي نقصرو"
            >
              <img
                src="/logo.jpeg"
                alt="شعار أجي نقصرو"
                className="size-9 shrink-0 rounded-xl object-cover ring-2 ring-[#B8F000]/50 shadow-md transition-transform group-hover:scale-105"
              />
              <div className="min-w-0">
                <span className="block text-base font-black tracking-tight text-white leading-tight">
                  أجي نقصرو
                </span>
                <span className="block text-[10px] font-bold text-[#D0FF38] truncate">
                  الكرة تجمعنا... مباريات وبطولات
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق القائمة"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-5 no-scrollbar">
          {/* SECTION A — اكتشف المنصة */}
          <section aria-labelledby="section-a-heading" className="space-y-1.5">
            <div
              id="section-a-heading"
              className="px-3 pb-1 text-[11px] font-black tracking-wider text-[#65706A] dark:text-[#B2B9B3] uppercase"
            >
              اكتشف المنصة
            </div>

            {/* 1. الرئيسية */}
            <button
              type="button"
              onClick={() => handleNav('/')}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                isItemActive('/', true)
                  ? 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] font-black shadow-2xs'
                  : 'text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-8 place-items-center rounded-lg transition-colors ${
                    isItemActive('/', true)
                      ? 'bg-[#179955] text-white dark:bg-[#D0FF38] dark:text-[#111313]'
                      : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                  }`}
                >
                  <Home className="size-4.5" />
                </span>
                <span>الرئيسية</span>
              </div>
              <ChevronLeft className="size-4 opacity-40" />
            </button>

            {/* 2. البطولات */}
            <button
              type="button"
              onClick={() => handleNav('/tournaments')}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                isItemActive('/tournaments')
                  ? 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] font-black shadow-2xs'
                  : 'text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-8 place-items-center rounded-lg transition-colors ${
                    isItemActive('/tournaments')
                      ? 'bg-[#179955] text-white dark:bg-[#D0FF38] dark:text-[#111313]'
                      : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                  }`}
                >
                  <Trophy className="size-4.5" />
                </span>
                <span>البطولات</span>
              </div>
              <ChevronLeft className="size-4 opacity-40" />
            </button>

            {/* 3. المباريات المباشرة */}
            <button
              type="button"
              onClick={() => handleNav('/matches')}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                location.pathname === '/live'
                  ? 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] font-black shadow-2xs'
                  : 'text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="relative grid size-8 place-items-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <Radio className="size-4.5" />
                  <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-rose-500 animate-ping" />
                  <span className="absolute -top-0.5 -end-0.5 size-2 rounded-full bg-rose-500" />
                </span>
                <span>المباريات المباشرة</span>
              </div>
              <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400">
                مباشر
              </span>
            </button>

            {/* 4. المباريات */}
            <button
              type="button"
              onClick={() => handleNav('/matches')}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                isItemActive('/matches') && location.pathname !== '/live'
                  ? 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] font-black shadow-2xs'
                  : 'text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-8 place-items-center rounded-lg transition-colors ${
                    isItemActive('/matches') && location.pathname !== '/live'
                      ? 'bg-[#179955] text-white dark:bg-[#D0FF38] dark:text-[#111313]'
                      : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                  }`}
                >
                  <CalendarDays className="size-4.5" />
                </span>
                <span>المباريات</span>
              </div>
              <ChevronLeft className="size-4 opacity-40" />
            </button>

            {/* 5. الملاعب */}
            <button
              type="button"
              onClick={() => handleNav('/fields')}
              className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                isItemActive('/fields') || isItemActive('/stadiums')
                  ? 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] font-black shadow-2xs'
                  : 'text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-8 place-items-center rounded-lg transition-colors ${
                    isItemActive('/fields') || isItemActive('/stadiums')
                      ? 'bg-[#179955] text-white dark:bg-[#D0FF38] dark:text-[#111313]'
                      : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                  }`}
                >
                  <MapPin className="size-4.5" />
                </span>
                <span>الملاعب</span>
              </div>
              <ChevronLeft className="size-4 opacity-40" />
            </button>
          </section>

          {/* Separator */}
          <div className="h-px bg-[#E1E5DF] dark:bg-[#303832] mx-2" aria-hidden="true" />

          {/* SECTION B — حسابك */}
          <section aria-labelledby="section-b-heading" className="space-y-1.5">
            <div
              id="section-b-heading"
              className="px-3 pb-1 text-[11px] font-black tracking-wider text-[#65706A] dark:text-[#B2B9B3] uppercase"
            >
              حسابك
            </div>

            {/* Authenticated User Card */}
            {user ? (
              <div className="mb-2 rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] p-3 border border-[#E1E5DF] dark:border-[#303832]">
                <div className="flex items-center gap-3">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="size-10 rounded-xl object-cover ring-1 ring-emerald-500/30"
                    />
                  ) : (
                    <div className="grid size-10 place-items-center rounded-xl bg-[#179955] text-white font-black text-sm">
                      {user.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black truncate">{user.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span className="rounded-full bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 px-2 py-0.5 text-[10px] font-black text-[#111313] dark:text-[#D0FF38]">
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-2 rounded-2xl bg-gradient-to-br from-[#179955]/10 to-[#B8F000]/10 border border-[#179955]/20 p-3">
                <p className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                  مرحباً بك في أجي نقصرو!
                </p>
                <p className="text-[11px] font-medium text-[#65706A] dark:text-[#B2B9B3] mt-0.5">
                  سجّل دخولك للوصول إلى لوحة التحكم ومبارياتك
                </p>
              </div>
            )}

            {/* 1. الملف الشخصي */}
            <button
              type="button"
              onClick={() => {
                if (user) {
                  handleNav(homeForRole(user.role))
                } else {
                  handleNav('/login?redirect=profile')
                }
              }}
              className="w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
                  <User className="size-4.5" />
                </span>
                <span>الملف الشخصي</span>
              </div>
              <ChevronLeft className="size-4 opacity-40" />
            </button>

            {/* 2. الإشعارات */}
            <button
              type="button"
              onClick={() => {
                onClose()
                if (user) {
                  if (onOpenNotifications) onOpenNotifications()
                } else {
                  handleNav('/login?redirect=notifications')
                }
              }}
              className="w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="relative grid size-8 place-items-center rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
                  <Bell className="size-4.5" />
                  {unread > 0 && (
                    <span className="absolute -top-1 -end-1 grid min-w-[16px] h-4 place-items-center rounded-full px-1 text-[9px] font-black text-white bg-rose-600 animate-pulse">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span>الإشعارات</span>
              </div>
              {unread > 0 ? (
                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-black text-rose-600 dark:text-rose-400">
                  {unread} جديد
                </span>
              ) : (
                <ChevronLeft className="size-4 opacity-40" />
              )}
            </button>

            {/* 3. الإعدادات */}
            <button
              type="button"
              onClick={() => {
                if (user) {
                  handleNav(getSettingsPath(user.role))
                } else {
                  handleNav('/login?redirect=settings')
                }
              }}
              className="w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
                  <Settings className="size-4.5" />
                </span>
                <span>الإعدادات</span>
              </div>
              <ChevronLeft className="size-4 opacity-40" />
            </button>

            {/* 4. تسجيل الدخول أو الخروج */}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#D93636] dark:text-[#FF6868] hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-rose-500/10 text-[#D93636] dark:text-[#FF6868]">
                    <LogOut className="size-4.5" />
                  </span>
                  <span>تسجيل الخروج</span>
                </div>
                <ChevronLeft className="size-4 opacity-40" />
              </button>
            ) : (
              <div className="pt-2 space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleNav('/login')}
                  className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#111313] dark:bg-[#252B27] text-white hover:brightness-110 px-4 py-2.5 text-sm font-bold transition-all cursor-pointer shadow-xs"
                >
                  <LogIn className="size-4.5 text-[#B8F000]" />
                  <span>تسجيل الدخول</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNav('/register-player')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] hover:brightness-105 px-4 py-2.5 text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  <Zap className="size-4" />
                  <span>سجّل كلاعب (مجاناً)</span>
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Footer Utilities (Theme & PWA) */}
        <div className="border-t border-[#E1E5DF] dark:border-[#303832] p-3 space-y-1.5 bg-[#F7F8F5]/60 dark:bg-[#161B18]/60">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] hover:bg-white dark:hover:bg-[#252B27] hover:text-[#111313] dark:hover:text-[#F5F7F2] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              {isDark ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-slate-600" />
              )}
              <span>{isDark ? 'الوضع النهاري' : 'الوضع الداكن'}</span>
            </div>
            <span className="text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
              {isDark ? 'مُفعّل' : 'مُعطّل'}
            </span>
          </button>

          {!isStandalone() && (
            <button
              type="button"
              onClick={() => {
                onClose()
                triggerPwaInstall()
              }}
              className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] hover:bg-white dark:hover:bg-[#252B27] hover:text-[#111313] dark:hover:text-[#F5F7F2] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Smartphone className="size-4 text-[#179955] dark:text-[#D0FF38]" />
                <span>تثبيت التطبيق</span>
              </div>
              <span className="text-[10px] bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] px-1.5 py-0.5 rounded-md font-bold">
                PWA
              </span>
            </button>
          )}
        </div>
      </aside>
    </div>,
    document.body
  )
}
