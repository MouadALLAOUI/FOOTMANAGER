import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Swords, Trophy, Users, Plus } from 'lucide-react'

export default function ProductionMobileNav() {
  const { t, i18n } = useTranslation()
  const location = useLocation()

  const isRtl = i18n.language?.startsWith('ar')
  const currentPath = location.pathname.replace(/\/$/, '')

  const isHome = currentPath === '/dashboard'
  const isMatches = currentPath.startsWith('/dashboard/matches')
  const isTournaments = currentPath.startsWith('/dashboard/tournaments')
  const isTeam = currentPath.startsWith('/dashboard/team')

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] lg:hidden">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto relative">
        {/* 1. Home */}
        <Link
          to="/dashboard"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isHome ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="size-5" />
          <span className="text-[10px] font-bold mt-1">
            {isRtl ? 'الرئيسية' : 'Home'}
          </span>
          {isHome && <span className="size-1 rounded-full bg-emerald-600 mt-0.5" />}
        </Link>

        {/* 2. Matches */}
        <Link
          to="/dashboard/matches"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isMatches ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Swords className="size-5" />
          <span className="text-[10px] font-bold mt-1">
            {isRtl ? 'المباريات' : 'Matches'}
          </span>
          {isMatches && <span className="size-1 rounded-full bg-emerald-600 mt-0.5" />}
        </Link>

        {/* 3. Center Elevated Quick Booking Action */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-6">
          <Link
            to="/fields"
            className="grid size-12 place-items-center rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/35 border-3 border-white active:scale-95 transition-all"
            aria-label="Book a stadium"
          >
            <Plus className="size-6 stroke-[3]" />
          </Link>
          <span className="text-[10px] font-black text-emerald-700 mt-1">
            {isRtl ? 'حجز' : 'Book'}
          </span>
        </div>

        {/* 4. Tournaments */}
        <Link
          to="/dashboard/tournaments"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isTournaments ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Trophy className="size-5" />
          <span className="text-[10px] font-bold mt-1">
            {isRtl ? 'البطولات' : 'Tournaments'}
          </span>
          {isTournaments && <span className="size-1 rounded-full bg-emerald-600 mt-0.5" />}
        </Link>

        {/* 5. My Team */}
        <Link
          to="/dashboard/team"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            isTeam ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Users className="size-5" />
          <span className="text-[10px] font-bold mt-1">
            {isRtl ? 'فريقي' : 'Team'}
          </span>
          {isTeam && <span className="size-1 rounded-full bg-emerald-600 mt-0.5" />}
        </Link>
      </div>
    </div>
  )
}
