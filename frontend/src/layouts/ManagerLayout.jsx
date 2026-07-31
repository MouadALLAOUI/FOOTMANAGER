import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, List, Search, Trophy, LogOut, Shield, UserCircle, Building2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, CalendarX } from 'lucide-react';
import DashboardHeader from '../components/Navigation/DashboardHeader';

export default function ManagerLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebar_collapsed') === 'true');
  const isAr = i18n.language === 'ar';
  const CollapseIcon = isAr ? (collapsed ? PanelRightOpen : PanelRightClose) : (collapsed ? PanelLeftOpen : PanelLeftClose);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', collapsed);
  }, [collapsed]);

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard'), end: true },
    { to: '/dashboard/my-requests', icon: List, label: t('nav.myRequests') },
    { to: '/dashboard/terrains', icon: Building2, label: t('nav.terrains') },
    { to: '/dashboard/browse', icon: Search, label: t('nav.browseMatches') },
    { to: '/dashboard/my-reservations', icon: CalendarX, label: t('nav.myReservations') },
    { to: '/dashboard/leaderboard', icon: Trophy, label: t('nav.leaderboard') },
    { to: '/dashboard/profile', icon: UserCircle, label: t('nav.teamProfile') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 start-0 z-50 bg-white border-e border-gray-200 shadow-lg transition-all duration-300 ease-in-out flex flex-col lg:h-screen overflow-y-auto ${mobileOpen ? '' : 'sidebar-hidden'} ${collapsed ? 'lg:w-[68px]' : 'lg:w-64'}`}>
        <div className={`flex items-center h-16 border-b border-gray-100 ${collapsed ? 'justify-center px-2' : 'gap-3 px-6'}`}>
          {user?.team?.logo_url ? (
            <img src={user.team.logo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <Shield className="text-green-600 shrink-0" size={22} />
          )}
          {!collapsed && <span className="font-bold text-gray-800 truncate">{user?.name || 'FootMANAGER'}</span>}
        </div>

        {!collapsed && user?.team && (
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="text-sm font-medium text-gray-700">{user.team.name || user.name}</div>
            <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {t(`categories.${user.team.category}`) || t('categories.team')}
            </span>
          </div>
        )}

        <nav className={`flex-1 p-3 space-y-1 overflow-y-auto ${collapsed ? 'px-2' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg text-sm transition ${collapsed ? 'justify-center px-2 py-2.5' : 'px-4 py-2.5'} ${isActive ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className={`border-t border-gray-100 p-3 space-y-1 ${collapsed ? 'px-2' : ''}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? t('common.expand') : t('common.collapse')}
            className={`w-full flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition text-sm ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <CollapseIcon size={16} /> : <CollapseIcon size={16} />}
            {!collapsed && <span className="text-xs">{collapsed ? t('common.expand') : t('common.collapse')}</span>}
          </button>
          <button
            onClick={logout}
            title={t('nav.logout')}
            className={`w-full flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={16} />
            {!collapsed && t('nav.logout')}
          </button>
        </div>
      </aside>

      <div className={`flex-1 flex flex-col min-w-0 ${collapsed ? 'lg:ms-[68px]' : 'lg:ms-64'}`}>
        <DashboardHeader navItems={navItems} settingsTo="/dashboard/profile" onMenuClick={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
