import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Shield, Swords } from 'lucide-react'
import api from '../../api/client'
import TeamLogo from '../../components/profile/TeamLogo'

export default function ChallengesWall({ theme = 'dark' }) {
  const [challenges, setChallenges] = useState([])
  const [loaded, setLoaded] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    let active = true
    api
      .get('/v1/matches', { params: { status: 'open', per_page: 10 } })
      .then((res) => {
        if (!active) return
        const list = res.data?.data || res.data || []
        // Filter to only true open challenges needing an opponent
        const openList = Array.isArray(list)
          ? list.filter((m) => m.status === 'open' || !m.opponent_team || m.opponent_id === null)
          : []
        setChallenges(openList)
      })
      .catch(() => {
        if (active) setChallenges([])
      })
      .finally(() => {
        if (active) setLoaded(true)
      })

    return () => {
      active = false
    }
  }, [])

  // CRITICAL REQUIREMENT: If there are NO active challenges (0), disappear completely without leaving any empty blank space!
  if (!loaded || challenges.length === 0) {
    return null
  }

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  const scroll = (direction) => {
    if (!scrollRef.current) return
    const offset = direction === 'left' ? -320 : 320
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' })
  }

  return (
    <section aria-labelledby="challenges-wall-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-4 sm:my-6 animate-fade-in">
      <div
        className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 transition-all ${
          isDark
            ? 'bg-[#14221C] border-emerald-900/50 shadow-2xl'
            : 'bg-white border-slate-200 shadow-xl'
        }`}
      >
        {/* Header with Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 mb-5 border-slate-700/30">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
              <Swords className="size-5 text-rose-400" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                  تحديات مباشرة
                </span>
                <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
              </div>
              <h2
                id="challenges-wall-heading"
                className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}
              >
                حائط التحديات الرياضية (مباريات بانتظار المنافس)
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Scroll Navigation Arrows */}
            <div className="hidden sm:flex items-center gap-1.5 me-2">
              <button
                type="button"
                onClick={() => scroll('right')}
                aria-label="التمرير إلى اليمين"
                className={`grid size-8 place-items-center rounded-xl border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll('left')}
                aria-label="التمرير إلى اليسار"
                className={`grid size-8 place-items-center rounded-xl border transition-colors cursor-pointer ${
                  isDark ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>

            <Link
              to="/matches"
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 px-3 py-1.5 text-xs font-black text-white shadow-xs transition-all active:scale-95 me-1"
            >
              <Swords className="size-3.5" />
              <span>دير تحدي</span>
            </Link>

            <Link
              to="/matches"
              className="text-xs font-black text-emerald-400 hover:text-emerald-300 transition-colors hidden xs:inline"
            >
              عرض كافة التحديات ↗
            </Link>
          </div>
        </div>

        {/* Horizontal Scrollable Row (Carousel by Touch & Drag) */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 overflow-x-auto no-scrollbar snap-x scroll-smooth pb-2"
        >
          {challenges.map((c) => {
            const host = c.host_team || c.team || { name: 'فريق رياضي' }
            const stadium = c.stadium?.name || c.terrain_name || 'ملعب معتمد'
            const city = c.stadium?.city || c.city || 'الدار البيضاء'
            const matchTime = c.match_datetime
              ? new Date(c.match_datetime).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })
              : '20:00'
            const matchDate = c.match_datetime
              ? new Date(c.match_datetime).toLocaleDateString('ar-MA', { weekday: 'short', day: 'numeric', month: 'short' })
              : 'قريباً'

            return (
              <article
                key={c.id}
                className={`w-[280px] sm:w-[320px] shrink-0 snap-start flex flex-col justify-between rounded-2xl border p-4 transition-all hover:scale-[1.01] ${
                  isDark
                    ? 'bg-[#121E33]/90 border-slate-700/60 shadow-md'
                    : 'bg-white border-slate-200/90 shadow-sm'
                }`}
              >
                {/* Team Info */}
                <div className="flex items-center gap-3">
                  <div className="size-11 shrink-0 rounded-xl bg-slate-800 p-0.5 ring-1 ring-emerald-500/30 flex items-center justify-center overflow-hidden">
                    <TeamLogo team={host} size="sm" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`text-xs sm:text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {host.name}
                    </h3>
                    <p className="text-[11px] font-bold text-emerald-500 flex items-center gap-1">
                      <MapPin className="size-3" />
                      <span>{city}</span>
                    </p>
                  </div>
                </div>

                {/* Match Logistics */}
                <div className="my-3 py-2 border-y border-slate-700/20 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 truncate">
                    <Calendar className="size-3 text-emerald-400" />
                    <span>{matchDate}</span>
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <Clock className="size-3 text-emerald-400" />
                    <span>{matchTime}</span>
                  </span>
                  <span className="col-span-2 flex items-center gap-1 truncate text-slate-300">
                    <Shield className="size-3 text-emerald-400" />
                    <span className="truncate">{stadium}</span>
                  </span>
                </div>

                {/* Accept Challenge Button */}
                <Link
                  to={`/matches?challenge=${c.id}&teamName=${encodeURIComponent(host.name)}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <span>قبول التحدي 🤝</span>
                </Link>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
