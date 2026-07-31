import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Globe, Menu, Trophy, ChevronDown, LayoutDashboard, Settings, LogOut } from 'lucide-react';
import NotificationBell from '../NotificationBell';

export default function DashboardHeader({ navItems = [], onMenuClick, settingsTo }) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAr = i18n.language === 'ar';
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const roleHome = user?.role === 'admin' ? '/admin' : user?.role === 'terrain_owner' ? '/terrain' : '/dashboard';
  const settingsPath = settingsTo || roleHome;

  const currentNavItem = navItems.find((item) => {
    const itemPath = item.to.split('?')[0];
    return itemPath === location.pathname || (itemPath !== '/' && location.pathname.startsWith(`${itemPath}/`));
  });
  const pageTitle = currentNavItem ? currentNavItem.label : t('nav.dashboard');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleLanguage = () => {
    i18n.changeLanguage(isAr ? 'en' : 'ar');
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const initials = user?.name?.charAt(0)?.toUpperCase() || '?';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center px-4 lg:px-8 gap-3">
      <button onClick={onMenuClick} className="lg:hidden text-gray-500 shrink-0" aria-label="menu">
        <Menu size={22} />
      </button>

      <Link to="/" className="flex items-center gap-2 shrink-0 group">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
          <Trophy size={18} className="text-white" />
        </span>
        <span className="hidden sm:block text-base font-black tracking-tight text-gray-800">
          Foot<span className="text-emerald-600">MANAGER</span>
        </span>
      </Link>

      <h1 className="text-lg font-semibold text-gray-800 truncate">{pageTitle}</h1>

      <div className="flex-1" />

      <button
        onClick={toggleLanguage}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition shrink-0"
      >
        <Globe size={16} />
        {isAr ? 'English' : 'العربية'}
      </button>

      <div className="shrink-0">
        <NotificationBell />
      </div>

      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 ps-2 pe-1.5 py-1.5 rounded-full hover:bg-gray-100 transition"
          aria-haspopup="menu"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </span>
          <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
            {user?.name}
          </span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <div className="absolute end-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="text-sm font-semibold text-gray-800 truncate">{user?.name}</div>
              <div className="text-xs text-gray-400">
                {user?.role === 'admin' ? t('admin.admin') : user?.role === 'terrain_owner' ? t('nav.terrainOwner') : t('auth.registerAsManager')}
              </div>
            </div>
            <Link
              to={roleHome}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <LayoutDashboard size={16} />
              {t('nav.dashboard')}
            </Link>
            <Link
              to={settingsPath}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <Settings size={16} />
              {t('nav.settings')}
            </Link>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={16} />
              {t('nav.logout')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
