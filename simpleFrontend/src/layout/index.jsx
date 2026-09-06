import { Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from './Navbar'
import Footer from './Footer'
import AnnouncementBar from '../components/system/AnnouncementBar'

export default function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-slate-900 focus:shadow-lg focus:ring-2 focus:ring-green-500"
      >
        {t('common.skipToContent')}
      </a>
      <AnnouncementBar />
      <Navbar />
      <div key={location.pathname} className="page-enter">
        <Outlet />
      </div>
      <Footer />
    </>
  )
}
