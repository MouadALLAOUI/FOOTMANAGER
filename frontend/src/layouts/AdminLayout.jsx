import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { Shield, LayoutDashboard, Clock, CheckCircle, XCircle, Ban, LogOut, Landmark, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Tag, CreditCard } from 'lucide-react';
import DashboardHeader from '../components/Navigation/DashboardHeader';

export default function AdminLayout() {
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
    { to: '/admin', icon: LayoutDashboard, label: t('admin.overview'), end: true },
    { to: '/admin/managers', icon: Clock, label: t('admin.pendingManagers') },
    { to: '/admin/managers?status=approved', icon: CheckCircle, label: t('admin.approvedTeams') },
    { to: '/admin/managers?status=rejected', icon: XCircle, label: t('admin.rejectedRequests') },
    { to: '/admin/managers?status=blocked', icon: Ban, label: t('admin.blockedUsers') },
    { to: '/admin/managers?status=all', icon: CheckCircle, label: t('admin.allManagers') },
  ];

  const terrainOwnerItems = [
    { to: '/admin/terrain-owners', icon: Landmark, label: t('admin.terrainOwners') },
    { to: '/admin/terrain-owners?status=pending', icon: Clock, label: t('admin.pendingTerrainOwners') },
    { to: '/admin/terrain-owners?status=approved', icon: CheckCircle, label: t('admin.approvedTerrainOwners') },
  ];

  const headerNavItems = [
    ...navItems,
    ...terrainOwnerItems,
    { to: '/admin/facilities', icon: Tag, label: t('admin.facilities') },
    { to: '/admin/plans', icon: CreditCard, label: t('admin.plans') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`fixed inset-y-0 start-0 z-50 bg-white border-e border-gray-200 shadow-lg transition-all duration-300 ease-in-out flex flex-col lg:h-screen overflow-y-auto ${mobileOpen ? '' : 'sidebar-hidden'} ${collapsed ? 'lg:w-[68px]' : 'lg:w-64'}`}>
        <div className={`flex items-center h-16 border-b border-gray-100 shrink-0 ${collapsed ? 'justify-center px-2' : 'gap-3 px-6'}`}>
          <Shield className="text-green-600 shrink-0" size={22} />
          {!collapsed && <span className="font-bold text-gray-800">{t('admin.adminPanel')}</span>}
        </div>
        <nav className={`flex-1 p-3 space-y-1 ${collapsed ? 'px-2' : ''}`}>
          {!collapsed && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">{t('admin.managers')}</div>}
          {collapsed && <div className="border-b border-gray-100 mb-2" />}
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

          <div className={`border-t border-gray-100 my-3`} />
          {!collapsed && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">{t('admin.terrainOwners')}</div>}
          {terrainOwnerItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg text-sm transition ${collapsed ? 'justify-center px-2 py-2.5' : 'px-4 py-2.5'} ${isActive ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
              }
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          ))}

          <div className={`border-t border-gray-100 my-3`} />
          {!collapsed && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">{t('admin.facilities')}</div>}
          <NavLink
            to="/admin/facilities"
            onClick={() => setMobileOpen(false)}
            title={t('admin.facilities')}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg text-sm transition ${collapsed ? 'justify-center px-2 py-2.5' : 'px-4 py-2.5'} ${isActive ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
            }
          >
            <Tag size={18} className="shrink-0" />
            {!collapsed && t('admin.facilities')}
          </NavLink>

          <div className={`border-t border-gray-100 my-3`} />
          {!collapsed && <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">{t('admin.plansSection')}</div>}
          <NavLink
            to="/admin/plans"
            onClick={() => setMobileOpen(false)}
            title={t('admin.plans')}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg text-sm transition ${collapsed ? 'justify-center px-2 py-2.5' : 'px-4 py-2.5'} ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`
            }
          >
            <CreditCard size={18} className="shrink-0" />
            {!collapsed && t('admin.plans')}
          </NavLink>
        </nav>
        <div className={`border-t border-gray-100 p-3 space-y-2 shrink-0 ${collapsed ? 'px-2' : ''}`}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-sm font-bold shrink-0">
                {user?.name?.charAt(0)}
              </div>
              <div className="text-sm min-w-0">
                <div className="font-medium text-gray-800 truncate">{user?.name}</div>
                <div className="text-gray-400 text-xs">{t('admin.admin')}</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-sm font-bold" title={user?.name}>
                {user?.name?.charAt(0)}
              </div>
            </div>
          )}
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
        <DashboardHeader navItems={headerNavItems} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
