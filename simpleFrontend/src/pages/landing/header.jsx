import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Moon,
  Sun,
  LayoutDashboard,
  Smartphone,
  LogOut,
  LogIn,
  UserPlus,
  Shield,
  User as UserIcon,
  X,
  ChevronLeft,
  Zap,
} from 'lucide-react'
import { useAuth, homeForRole } from '../../context/AuthContext'
import { useNotificationUnreadCount } from '../../api/queries'
import { triggerPwaInstall, isStandalone } from './pwaHelper'
import NotificationSheet from './notificationSheet'

export default function MainHeader({ theme = 'dark', onToggleTheme }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)

  // Real notifications (only when user is authenticated)
  const { data: unreadData } = useNotificationUnreadCount({
    refetchInterval: 60_000,
    enabled: Boolean(user),
  })
  const unread = unreadData?.unread_count || 0

  const handleLogout = async () => {
    try {
      if (logout) await logout()
      setAccountMenuOpen(false)
      navigate('/')
    } catch {}
  }

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  // User Initials or Avatar
  const userInitial = user?.name ? user.name.trim().charAt(0).toUpperCase() : null

  return (
    <header
      className={`relative z-40 w-full max-w-full overflow-visible transition-colors ${
        isDark
          ? 'bg-[#14221C]/95 border-b border-emerald-900/50 backdrop-blur-md'
          : 'bg-white/95 border-b border-slate-200/80 backdrop-blur-md'
      }`}
    >
      <div className="mx-auto flex h-16 sm:h-18 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* 1. الشعار مع الاسم (Logo with Name) */}
        <Link
          to="/"
          className="group flex items-center gap-2.5 sm:gap-3 shrink-0"
          aria-label="الصفحة الرئيسية - أجي نقصرو"
        >
          <img
            src="/logo.jpeg"
            alt="شعار منصة أجي نقصرو"
            className="size-9 sm:size-10 shrink-0 rounded-2xl object-cover shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500/30 transition-transform group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span
              className={`text-base sm:text-lg font-black tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              أجي نقصرو
            </span>
            <span
              className={`hidden text-[10px] font-bold sm:block ${
                isDark ? 'text-emerald-400' : 'text-emerald-600'
              }`}
            >
              منصة دوريات كرة القدم وملاعب القرب
            </span>
          </div>
        </Link>

        {/* 2. الإشعارات وصورة الحساب (Notifications & Account Avatar) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* الإشعارات (Notifications Bell) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  navigate('/login')
                  return
                }
                setNotifOpen((v) => !v)
                setAccountMenuOpen(false)
              }}
              aria-label="الإشعارات والتنبيهات"
              className={`relative grid size-10 place-items-center rounded-2xl border transition-all cursor-pointer ${
                isDark
                  ? 'border-emerald-900/50 bg-[#14221C] text-slate-300 hover:bg-emerald-900/30 hover:text-white'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Bell className="size-4.5" />
              {unread > 0 && (
                <span
                  className="absolute -end-1 -top-1 grid min-w-[18px] h-[18px] place-items-center rounded-full px-1 text-[10px] font-black text-white shadow-xs animate-pulse"
                  style={{ backgroundColor: '#B53E5B' }}
                >
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {/* نافذة الإشعارات وقائمتها المنبثقة */}
            <NotificationSheet
              isOpen={notifOpen}
              onClose={() => setNotifOpen(false)}
              isDark={isDark}
              unreadCount={unread}
            />
          </div>

          {/* صورة الحساب (Account Avatar Button) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setAccountMenuOpen((v) => !v)
                setNotifOpen(false)
              }}
              aria-label="قائمة الحساب والإعدادات"
              title={user ? user.name : 'قائمة الحساب'}
              className="relative grid size-10 place-items-center rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 p-0.5 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-emerald-500/20"
            >
              {user ? (
                user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="size-full rounded-[14px] object-cover"
                  />
                ) : (
                  <span className="text-sm font-black text-emerald-400">{userInitial}</span>
                )
              ) : (
                <UserIcon className="size-5 text-emerald-400" />
              )}
            </button>

            {/* القائمة الشاملة التي تفتح عند الضغط على صورة الحساب */}
            {accountMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
                <div
                  role="menu"
                  className={`fade-in absolute end-0 top-12 z-50 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border p-3 shadow-2xl ${
                    isDark
                      ? 'border-emerald-900/50 bg-[#14221C] text-white shadow-black/90'
                      : 'border-slate-200 bg-white text-slate-900 shadow-xl'
                  }`}
                >
                  {/* User Profile Header */}
                  <div className="p-3 border-b border-slate-700/30 mb-2">
                    {user ? (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-black truncate">{user.name}</p>
                          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                            {user.role === 'admin'
                              ? 'مدير المنصة'
                              : user.role === 'manager'
                              ? 'مسير فريق'
                              : user.role === 'committee'
                              ? 'لجنة تنظيمية'
                              : 'لاعب'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {user.email || user.phone}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-black">مرحباً بك في أجي نقصرو!</p>
                          <p className="text-[10px] text-slate-400">سجّل دخولك للوصول إلى فريقك</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Menu Options */}
                  <div className="space-y-1 text-xs font-bold">
                    {/* 1. زر لوحة التحكم */}
                    {user && (
                      <Link
                        to={homeForRole(user.role)}
                        onClick={() => setAccountMenuOpen(false)}
                        className={`flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 transition-colors ${
                          isDark
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <LayoutDashboard className="size-4" />
                          <span>لوحة التحكم</span>
                        </div>
                        <ChevronLeft className="size-4 opacity-70" />
                      </Link>
                    )}

                    {/* 2. زر الوضع الداكن / النهاري */}
                    <button
                      type="button"
                      onClick={() => {
                        if (onToggleTheme) onToggleTheme()
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isDark ? (
                          <Sun className="size-4 text-amber-400" />
                        ) : (
                          <Moon className="size-4 text-slate-600" />
                        )}
                        <span>{isDark ? 'الوضع النهاري' : 'الوضع الداكن'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">
                        {isDark ? 'مُفعّل' : 'مُعطّل'}
                      </span>
                    </button>

                    {/* 3. خيار تثبيت التطبيق (PWA Install) */}
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false)
                        triggerPwaInstall()
                      }}
                      className={`w-full flex items-center justify-between gap-2 rounded-2xl px-3.5 py-2.5 transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="size-4 text-emerald-400" />
                        <span>{isStandalone() ? 'التطبيق مُثبّت بنجاح' : 'ثبّت التطبيق'}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md font-bold">
                        {isStandalone() ? 'جاهز' : 'PWA'}
                      </span>
                    </button>

                    {/* Guest Options */}
                    {!user && (
                      <div className="pt-2 border-t border-slate-700/30 space-y-1.5">
                        <Link
                          to="/register-player"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center justify-between gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-3.5 py-2.5 font-black transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            <Zap className="size-4" />
                            <span>سجّل كلاعب (فوري)</span>
                          </div>
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-lg">مجاناً</span>
                        </Link>

                        <Link
                          to="/login"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white px-3.5 py-2.5 font-bold transition-colors border border-slate-700/60"
                        >
                          <LogIn className="size-4" />
                          <span>تسجيل الدخول</span>
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setAccountMenuOpen(false)}
                          className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 transition-colors ${
                            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <UserPlus className="size-4" />
                          <span>إنشاء حساب جديد</span>
                        </Link>
                      </div>
                    )}

                    {/* Logout Option */}
                    {user && (
                      <div className="pt-2 border-t border-slate-700/30">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <LogOut className="size-4" />
                          <span>تسجيل الخروج</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
