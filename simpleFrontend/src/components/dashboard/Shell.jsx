import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronsUpDown,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Sparkles,
  UserCircle2,
  X,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ActivityLockBanner from '../ui/ActivityLockBanner'
import { PushEnableBanner } from '../notifications/EnablePushNotifications'
import ProfileAvatar from '../profile/ProfileAvatar'
import ItemIcon from './ItemIcon'
import { useNotifications, useNotificationUnreadCount } from '../../api/queries'
import { queryClient } from '../../api/queryClient'
import api from '../../api/client'
import CommandPalette from '../ui/CommandPalette'
import QuickActions from '../ui/QuickActions'

const brandGradient = 'from-green-400 to-emerald-600'

const defaultQuickActions = [
  { label: 'shell.quick.newMatch', to: '/dashboard/matches?new=1', icon: CalendarDays },
  { label: 'shell.quick.bookTerrain', to: '/dashboard/bookings?new=1', icon: Sparkles },
  { label: 'shell.quick.findOpponent', to: '/dashboard/feed', icon: Search },
  { label: 'shell.quick.findPlayer', to: '/dashboard/recruitment', icon: UserCircle2 },
]

export default function Shell({
  items,
  brand,
  homeUrl = '/',
  children,
  roleLabel = 'shell.roleManager',
  quickActions = defaultQuickActions,
  notifPath = '/dashboard/notifications',
  settingsPath = '/dashboard/settings',
  profilePath = '/dashboard/profile',
  headerSlot = null,
}) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  const { data: unreadData } = useNotificationUnreadCount({ refetchInterval: 60_000 })
  const unread = unreadData?.unread_count || 0
  const { data: notifData } = useNotifications({ filter: 'unread' }, { enabled: notifOpen })
  const notifs = (notifData?.notifications || []).slice(0, 5)

  const currentPath = location.pathname.replace(/\/$/, '') || '/'
  const active = items.find((i) => i.to === location.pathname || i.to.replace(/\/$/, '') === currentPath)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const today = useMemo(() => {
    try {
      const locale = i18n.language?.startsWith('en') ? 'en' : 'ar-MA'
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date())
    } catch {
      return ''
    }
  }, [i18n.language])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch {
      // ignore
    }
  }

  const go = (to) => {
    setMobileOpen(false)
    setPaletteOpen(false)
    setQuickOpen(false)
    setProfileOpen(false)
    setNotifOpen(false)
    navigate(to)
  }

  const paletteGroups = [
    { key: 'nav', items },
    { key: 'quick', label: 'shell.quickActionsTitle', hiddenOnEmpty: true, items: quickActions },
  ]

  const navLink = (item, onNavigate) => {
    const isActive = location.pathname === item.to
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        onMouseEnter={() => item.prefetch?.()}
        title={t(item.label)}
        className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition-all duration-200 ${
          isActive
            ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
            : 'text-white/50 hover:bg-white/[0.05] hover:text-white'
        }`}
      >
        <span
          className={`grid size-6 shrink-0 place-items-center transition-colors ${
            isActive ? 'text-green-400' : 'text-white/40 group-hover:text-white/80'
          }`}
        >
          <ItemIcon icon={item.icon} className="size-[19px]" strokeWidth={isActive ? 2.4 : 2} />
        </span>
        <span className="truncate">{t(item.label)}</span>
        {isActive && <span className="absolute inset-y-3 start-0 w-[3px] rounded-e-full bg-green-500" />}
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 px-5 pb-4 pt-6 ${collapsed ? 'justify-center' : ''}`}>
        <Link to={homeUrl} onClick={() => setMobileOpen(false)} className="flex min-w-0 items-center gap-3">
          <div className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${brandGradient} shadow-[0_8px_20px_rgba(34,197,94,0.35)]`}>
            <Command className="size-5 text-white" strokeWidth={2.6} />
          </div>
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-black text-white">{t(brand)}</p>
              <p className="text-[10px] font-semibold text-white/40">{t('shell.brandTagline')}</p>
            </div>
          )}
        </Link>
      </div>

      <nav className={`flex-1 space-y-1 overflow-y-auto px-3 ${collapsed ? 'mt-2' : 'mt-1'}`} aria-label={t('shell.mainNav')}>
        {items.map((item) => navLink(item, () => setMobileOpen(false)))}
      </nav>

      <div className={`mt-2 space-y-1 border-t border-white/[0.07] p-3 ${collapsed ? 'flex flex-col' : ''}`}>
        <Link
          to={notifPath}
          onClick={() => setMobileOpen(false)}
          title={t('shell.notifications')}
          className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <span className="relative grid size-6 shrink-0 place-items-center">
            <Bell className="size-[19px] text-white/40" />
            {unread > 0 && (
              <span className="absolute -end-1 -top-1 grid size-4 place-items-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                {unread}
              </span>
            )}
          </span>
          {!collapsed && t('shell.notifications')}
        </Link>
        <Link
          to={settingsPath}
          onClick={() => setMobileOpen(false)}
          title={t('shell.settings')}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <Settings className="size-[19px] shrink-0 text-white/40" />
          {!collapsed && t('shell.settings')}
        </Link>
        <Link
          to={profilePath}
          onClick={() => setMobileOpen(false)}
          title={t('shell.profile')}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-white/50 transition-colors hover:bg-white/[0.05] hover:text-white ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <UserCircle2 className="size-[19px] shrink-0 text-white/40" />
          {!collapsed && t('shell.profile')}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          title={t('shell.logout')}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-rose-400 transition-colors hover:bg-rose-500/10 ${
            collapsed ? 'justify-center px-0' : ''
          }`}
        >
          <LogOut className="size-[19px] shrink-0" />
          {!collapsed && t('shell.logout')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f6f7fb]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-green-500"
      >
        {t('common.skipToContent')}
      </a>
      <aside
        className={`fixed inset-y-0 start-0 z-40 hidden pitch-lines flex-col bg-[#0b1220] transition-all duration-300 lg:flex ${
          collapsed ? 'w-[84px]' : 'w-[264px]'
        }`}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -end-3 top-16 z-10 grid size-6 place-items-center rounded-full border border-white/10 bg-[#131d33] text-white/60 transition-colors hover:text-white"
          title={collapsed ? t('shell.expand') : t('shell.collapse')}
        >
          <ChevronDown className={`size-3.5 ${collapsed ? 'rotate-180 rtl:rotate-0' : 'rotate-0 rtl:rotate-180'} transition-transform`} />
        </button>
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 start-0 w-[290px] bg-[#0b1220]">{sidebarContent}</aside>
        </div>
      )}

      <main id="main-content" className={`min-w-0 transition-all duration-300 ${collapsed ? 'lg:ps-[84px]' : 'lg:ps-[264px]'}`}>
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-5 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? t('shell.closeMenu') : t('shell.openMenu')}
              aria-expanded={mobileOpen}
              className="grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 lg:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-slate-900">
                <span className="sm:hidden">
                  {active?.shortLabel ? t(active.shortLabel) : active ? t(active.label) : t(roleLabel)}
                </span>
                <span className="hidden sm:inline">
                  {active ? t(active.label) : t(roleLabel)}
                </span>
              </p>
              <p className="hidden text-[11px] font-semibold text-slate-500 sm:block">{today}</p>
            </div>

            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-10 w-64 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-white md:flex"
            >
              <Search className="size-4" />
              <span className="flex-1 text-start">{t('shell.searchPlaceholder')}</span>
              <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                Ctrl K
              </kbd>
            </button>

            {headerSlot}

            <QuickActions
              open={quickOpen}
              onToggle={() => setQuickOpen((v) => !v)}
              onClose={() => setQuickOpen(false)}
              onSelect={(a) => go(a.to)}
              actions={quickActions}
              label="shell.quickAction"
              triggerClassName="hidden h-10 items-center rounded-xl bg-green-500 px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] transition-all hover:bg-green-600 sm:inline-flex"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label={t('shell.notifications')}
                aria-expanded={notifOpen}
                aria-haspopup="menu"
                className="relative grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
              >
                <Bell className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute -end-1 -top-1 grid size-4.5 min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div role="menu" className="absolute end-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-extrabold text-slate-900">{t('shell.notifications')}</p>
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-[11px] font-bold text-green-600 hover:text-green-700"
                      >
                        {t('shell.markAllRead')}
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifs.length === 0 ? (
                        <p className="px-4 py-8 text-center text-xs text-slate-500">{t('shell.noNotifications')}</p>
                      ) : (
                        notifs.map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => go(notifPath)}
                            className={`block w-full border-b border-slate-50 px-4 py-3 text-start transition-colors hover:bg-slate-50 ${
                              n.is_read ? '' : 'bg-green-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-extrabold text-slate-800">{n.title}</p>
                              {!n.is_read && <span className="size-1.5 shrink-0 rounded-full bg-green-500" />}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{n.body}</p>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => go(notifPath)}
                      className="block w-full bg-slate-50 px-4 py-2.5 text-center text-xs font-bold text-green-600 hover:text-green-700"
                    >
                      {t('shell.viewAllNotifications')}
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 ps-1.5 pe-3 transition-colors hover:bg-slate-50"
              >
                <ProfileAvatar user={user} className="size-8 rounded-lg" rounded="rounded-lg" fontSize="text-xs" />
                <span className="hidden max-w-[90px] truncate text-start sm:block">
                  <span className="block truncate text-xs font-bold text-slate-800">{user?.name}</span>
                  <span className="block text-[10px] font-semibold text-slate-500">{t(roleLabel)}</span>
                </span>
                <ChevronsUpDown className="size-3.5 text-slate-500" />
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div role="menu" className="absolute end-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
                    <div className="border-b border-slate-100 px-3 py-2.5">
                      <p className="truncate text-sm font-extrabold text-slate-900">{user?.name}</p>
                      <p className="truncate text-[11px] text-slate-500">{user?.email || user?.phone}</p>
                    </div>
                    <div className="pt-1.5">
                      <Link
                        to={profilePath}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <UserCircle2 className="size-4 text-slate-500" />
                        {t('shell.profile')}
                      </Link>
                      <Link
                        to={settingsPath}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <Settings className="size-4 text-slate-500" />
                        {t('shell.settings')}
                      </Link>
                      <Link
                        to={homeUrl}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                      >
                        <LayoutDashboard className="size-4 text-slate-500" />
                        {t('shell.website')}
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50"
                      >
                        <LogOut className="size-4" />
                        {t('shell.logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div key={location.pathname} className="page-enter mx-auto max-w-[1400px] px-5 py-7 lg:px-8">
          <PushEnableBanner />
          <ActivityLockBanner />
          {children}
        </div>
      </main>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        groups={paletteGroups}
        placeholder={t('shell.palettePlaceholder')}
        hint={t('shell.paletteHint')}
        currentTo={location.pathname}
      />
    </div>
  )
}
