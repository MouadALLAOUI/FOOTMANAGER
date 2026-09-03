import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  Globe,
  LogOut,
  ChevronDown,
  Trophy,
  Bell,
  Search,
  UserRound,
  ShieldAlert,
  ClipboardList,
  Settings,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ActivityLockBanner from '../ui/ActivityLockBanner'
import { PushEnableBanner } from '../notifications/EnablePushNotifications'
import ProfileAvatar from '../profile/ProfileAvatar'
import { cn } from './ui'
import { useNotifications, useNotificationUnreadCount } from '../../api/queries'
import { queryClient } from '../../api/queryClient'
import api from '../../api/client'
import CommandPalette from '../ui/CommandPalette'
import QuickActions from '../ui/QuickActions'

const roleLabels = {
  admin: 'shell.roleAdmin',
  sub_admin: 'shell.roleSubAdmin',
  manager: 'shell.roleManager',
  terrain_owner: 'shell.roleTerrainOwner',
  player: 'shell.rolePlayer',
  committee: 'shell.roleCommittee',
}

const quickActions = [
  { to: '/admin/managers', label: 'nav.admin.managers', icon: UserRound },
  { to: '/admin/moderation', label: 'nav.admin.moderation', icon: ShieldAlert },
  { to: '/admin/activities', label: 'nav.admin.activity', icon: ClipboardList },
  { to: '/admin/notifications', label: 'nav.admin.notifications', icon: Bell },
  { to: '/admin/settings', label: 'nav.admin.settings', icon: Settings },
]

export default function Shell({ groups, brand = 'admin.brand', homeUrl = '/', children }) {
  const { t } = useTranslation()
  const location = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)

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

  const { data: unreadData } = useNotificationUnreadCount({ refetchInterval: 60_000 })
  const unread = unreadData?.unread_count || 0
  const { data: notifData } = useNotifications({ filter: 'unread' }, { enabled: notifOpen })
  const notifs = (notifData?.notifications || []).slice(0, 5)

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

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0F172A]">
      <Link to={homeUrl} className="flex items-center gap-3 px-5 py-6">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-[0_12px_28px_rgba(34,197,94,0.45)]">
          <Trophy className="size-6 text-white" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-black text-white">{t('shell.brandTagline')}</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">{t(brand)}</p>
        </div>
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4" aria-label={t('shell.mainNav')}>
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t(group.label)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => item.prefetch?.()}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold transition-all duration-200',
                      isActive
                        ? 'bg-white/[0.07] text-white'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute inset-y-1.5 start-0 w-1 rounded-full bg-green-500 shadow-[0_0_14px_rgba(34,197,94,0.8)]" />
                      )}
                      <item.icon
                        className={cn(
                          'size-[18px] shrink-0 transition-colors',
                          isActive ? 'text-green-400' : 'text-slate-500 group-hover:text-slate-300',
                        )}
                        strokeWidth={2.1}
                      />
                      {t(item.label)}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          to={homeUrl}
          className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-slate-100"
        >
          <Globe className="size-[18px]" strokeWidth={2.1} />
          {t('shell.site')}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          <LogOut className="size-[18px]" strokeWidth={2.1} />
          {t('shell.logout')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-green-500"
      >
        {t('common.skipToContent')}
      </a>
      <aside className="fixed inset-y-0 start-0 z-40 hidden w-[272px] bg-[#0F172A] lg:block">
        {sidebar}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <aside className="drawer-in absolute inset-y-0 start-0 w-[292px] bg-[#0F172A] shadow-2xl">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:ps-[272px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? t('shell.closeMenu') : t('shell.openMenu')}
              aria-expanded={open}
              className="grid size-10 place-items-center rounded-2xl text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <span className="hidden text-sm font-bold text-slate-500 sm:block">
              {t('shell.adminPlatform')}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="hidden h-10 w-60 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-500 transition-colors hover:border-slate-300 hover:bg-white md:flex"
            >
              <Search className="size-4" />
              <span className="flex-1 text-start">{t('shell.searchPlaceholder')}</span>
              <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                Ctrl K
              </kbd>
            </button>

            <QuickActions
              open={quickOpen}
              onToggle={() => setQuickOpen((v) => !v)}
              onClose={() => setQuickOpen(false)}
              onSelect={(a) => {
                setQuickOpen(false)
                setPaletteOpen(false)
                navigate(a.to)
              }}
              actions={quickActions}
              label="shell.quickAction"
              triggerClassName="hidden h-10 items-center rounded-2xl bg-green-500 px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] transition-all hover:bg-green-600 sm:inline-flex"
            />

            <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label={t('shell.notifications')}
              aria-expanded={notifOpen}
              aria-haspopup="menu"
              className="relative grid size-10 place-items-center rounded-2xl text-slate-600 transition-colors hover:bg-slate-100"
            >
              <Bell className="size-[19px]" strokeWidth={2.1} />
              {unread > 0 && (
                <span className="absolute -end-0.5 -top-0.5 grid size-4.5 min-w-[18px] place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white">
                  {unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div role="menu" className="fade-in absolute end-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
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
                        <Link
                          key={n.id}
                          to="/admin/notifications"
                          onClick={() => setNotifOpen(false)}
                          className={`block w-full border-b border-slate-50 px-4 py-3 text-start transition-colors hover:bg-slate-50 ${
                            n.is_read ? '' : 'bg-green-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-extrabold text-slate-800">{n.title}</p>
                            {!n.is_read && <span className="size-1.5 shrink-0 rounded-full bg-green-500" />}
                          </div>
                          {n.body && <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{n.body}</p>}
                        </Link>
                      ))
                    )}
                  </div>
                  <Link
                    to="/admin/notifications"
                    onClick={() => setNotifOpen(false)}
                    className="block w-full bg-slate-50 px-4 py-2.5 text-center text-xs font-bold text-green-600 hover:text-green-700"
                  >
                    {t('shell.viewAllNotifications')}
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenu((v) => !v)}
              aria-expanded={userMenu}
              aria-haspopup="menu"
              className="flex items-center gap-2.5 rounded-2xl py-1.5 ps-1.5 pe-3 transition-colors hover:bg-slate-100"
            >
              <ProfileAvatar user={user} className="size-9 rounded-full" fontSize="text-sm" />
              <div className="hidden text-start sm:block">
                <p className="text-[13px] font-bold leading-tight text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500">{roleLabels[user?.role] ? t(roleLabels[user?.role]) : user?.role}</p>
              </div>
              <ChevronDown className={cn('size-4 text-slate-500 transition-transform', userMenu && 'rotate-180')} />
            </button>

            {userMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenu(false)} />
                <div role="menu" className="fade-in absolute end-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-3xl bg-white p-2 shadow-2xl ring-1 ring-slate-200">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-black text-slate-900">{user?.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500" dir="ltr">{user?.email}</p>
                  </div>
                  <div className="pt-1">
                    <Link
                      to="/admin/profile"
                      onClick={() => setUserMenu(false)}
                      className="block rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      {t('shell.profile')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50"
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

        <main id="main-content" key={location.pathname} className="page-enter mx-auto max-w-[1320px] px-4 py-7 sm:px-6">
          <PushEnableBanner />
          <ActivityLockBanner />
          {children}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        groups={[
          ...groups,
          { key: 'quick', label: 'shell.quickActionsTitle', hiddenOnEmpty: true, items: quickActions },
        ]}
        placeholder={t('shell.palettePlaceholder')}
        hint={t('shell.paletteHint')}
        currentTo={location.pathname}
      />
    </div>
  )
}
