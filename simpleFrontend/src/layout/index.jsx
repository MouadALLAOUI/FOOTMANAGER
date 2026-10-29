import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './Navbar'
import Footer from './Footer'
import BottomNav from '../pages/landing/bottomNav'

export default function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[var(--z-toast)] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-green-500"
      >
        {t('common.skipToContent')}
      </a>

      {!isLanding && <Navbar />}

      <div
        key={location.pathname}
        className="page-enter w-full max-w-full overflow-x-hidden min-h-[100dvh] pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+var(--genie-size))] sm:pb-12"
      >
        <Outlet />
      </div>

      <Footer />

      {/* Unified Sticky Mobile Bottom Nav Across All Platform Pages */}
      <BottomNav />
    </>
  )
}

