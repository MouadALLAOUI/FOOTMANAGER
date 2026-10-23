import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, CalendarDays, BarChart3, MoreHorizontal } from 'lucide-react'

export default function CommitteeMobileNav({ activeTournamentId = null, onOpenMore = null }) {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const isRtl = i18n.language?.startsWith('ar')
  const currentPath = location.pathname.replace(/\/$/, '')

  const isHome = currentPath === '/committee'
  const isMatches = currentPath.startsWith('/committee/tournaments') && location.search.includes('tab=fixtures')
  const isReports = currentPath.startsWith('/committee/tournaments') && location.search.includes('tab=analytics')
  const isMore = currentPath.startsWith('/committee/settings') || currentPath.startsWith('/committee/profile') || currentPath.startsWith('/committee/notifications')

  const matchesUrl = activeTournamentId
    ? `/committee/tournaments/${activeTournamentId}?tab=fixtures`
    : '/committee/tournaments'

  const reportsUrl = activeTournamentId
    ? `/committee/tournaments/${activeTournamentId}?tab=analytics`
    : '/committee/tournaments'

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden"
      aria-label="Committee Mobile Navigation"
    >
      <div className="flex items-center justify-around h-16 px-3 max-w-md mx-auto">
        {/* 1. الرئيسية */}
        <Link
          to="/committee"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isHome ? 'text-[#0F9D58] font-extrabold' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <Home className="size-5" />
          <span className="text-[10px] mt-1">{isRtl ? 'الرئيسية' : 'Home'}</span>
          {isHome && <span className="size-1 rounded-full bg-[#0F9D58] mt-0.5" />}
        </Link>

        {/* 2. المباريات */}
        <Link
          to={matchesUrl}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isMatches ? 'text-[#0F9D58] font-extrabold' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <CalendarDays className="size-5" />
          <span className="text-[10px] mt-1">{isRtl ? 'المباريات' : 'Matches'}</span>
          {isMatches && <span className="size-1 rounded-full bg-[#0F9D58] mt-0.5" />}
        </Link>

        {/* 3. التقارير */}
        <Link
          to={reportsUrl}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isReports ? 'text-[#0F9D58] font-extrabold' : 'text-slate-400 font-bold hover:text-slate-600'
          }`}
        >
          <BarChart3 className="size-5" />
          <span className="text-[10px] mt-1">{isRtl ? 'التقارير' : 'Reports'}</span>
          {isReports && <span className="size-1 rounded-full bg-[#0F9D58] mt-0.5" />}
        </Link>

        {/* 4. المزيد */}
        {onOpenMore ? (
          <button
            type="button"
            onClick={onOpenMore}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isMore ? 'text-[#0F9D58] font-extrabold' : 'text-slate-400 font-bold hover:text-slate-600'
            }`}
          >
            <MoreHorizontal className="size-5" />
            <span className="text-[10px] mt-1">{isRtl ? 'المزيد' : 'More'}</span>
            {isMore && <span className="size-1 rounded-full bg-[#0F9D58] mt-0.5" />}
          </button>
        ) : (
          <Link
            to="/committee/settings"
            className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
              isMore ? 'text-[#0F9D58] font-extrabold' : 'text-slate-400 font-bold hover:text-slate-600'
            }`}
          >
            <MoreHorizontal className="size-5" />
            <span className="text-[10px] mt-1">{isRtl ? 'المزيد' : 'More'}</span>
            {isMore && <span className="size-1 rounded-full bg-[#0F9D58] mt-0.5" />}
          </Link>
        )}
      </div>
    </nav>
  )
}
