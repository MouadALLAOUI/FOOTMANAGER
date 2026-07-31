import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, LogIn, LayoutDashboard, LogOut, Menu, Trophy, UserPlus, User, X, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LandingHeader() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isAr = i18n.language === 'ar';

  useEffect(() => {
    const onClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const goToSection = (id) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const goTo = (path) => {
    setMobileOpen(false);
    setProfileOpen(false);
    navigate(path);
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(isAr ? 'en' : 'ar');
  };

  const handleLogout = async () => {
    setMobileOpen(false);
    setProfileOpen(false);
    await logout();
    navigate('/');
  };

  const dashboardPath = user?.role === 'admin' ? '/admin' : user?.role === 'terrain_owner' ? '/terrain' : '/dashboard';
  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'terrain_owner' ? t('auth.registerAsTerrainOwner') : t('auth.registerAsManager');
  const displayName = user?.name || user?.team?.name || t('nav.profile');

  const links = [
    { label: t('landing.nav.features'), onClick: () => goToSection('features') },
    { label: t('landing.nav.about'), onClick: () => goTo('/about') },
    { label: t('landing.nav.faq'), onClick: () => goTo('/faq') },
    { label: t('landing.nav.contact'), onClick: () => goToSection('contact') },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 group">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-300">
              <Trophy size={22} className="text-white" />
            </span>
            <span className="text-xl font-black tracking-tight text-white">
              Foot<span className="text-emerald-400">MANAGER</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <button
                key={l.label}
                onClick={l.onClick}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
              >
                {l.label}
              </button>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              <Globe size={16} />
              {isAr ? 'English' : 'العربية'}
            </button>
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 transition"
                >
                  <span className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <User size={16} />
                  </span>
                  <span className="max-w-[140px] truncate font-bold">{displayName}</span>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                {profileOpen && (
                  <div className="absolute end-0 mt-2 w-56 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl p-2 space-y-1">
                    <div className="px-3 py-2 border-b border-slate-700">
                      <p className="text-sm font-bold text-white truncate">{displayName}</p>
                      <p className="text-[11px] text-emerald-400 font-semibold">{roleLabel}</p>
                    </div>
                    <button
                      onClick={() => goTo(dashboardPath)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 transition"
                    >
                      <LayoutDashboard size={15} />
                      {t('landing.nav.dashboard')}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition"
                    >
                      <LogOut size={15} />
                      {t('landing.nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:text-white hover:bg-white/5 transition"
                >
                  <LogIn size={16} />
                  {t('landing.nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 transition"
                >
                  <UserPlus size={16} />
                  {t('landing.nav.getStarted')}
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden text-slate-200 hover:text-white p-2"
            aria-label="menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 pb-6 pt-3 space-y-1">
          {links.map((l) => (
            <button
              key={l.label}
              onClick={l.onClick}
              className="w-full text-start px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              {l.label}
            </button>
          ))}
          <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition"
            >
              <Globe size={16} />
              {isAr ? 'English' : 'العربية'}
            </button>
            {user ? (
              <>
                <button
                  onClick={() => goTo(dashboardPath)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-slate-200 border border-slate-700 hover:bg-white/5 transition"
                >
                  <LayoutDashboard size={16} />
                  {t('landing.nav.dashboard')}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-red-400 border border-red-500/40 hover:bg-red-500/10 transition"
                >
                  <LogOut size={16} />
                  {t('landing.nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold text-slate-200 border border-slate-700 hover:bg-white/5 transition"
                >
                  <LogIn size={16} />
                  {t('landing.nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition"
                >
                  <UserPlus size={16} />
                  {t('landing.nav.getStarted')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
