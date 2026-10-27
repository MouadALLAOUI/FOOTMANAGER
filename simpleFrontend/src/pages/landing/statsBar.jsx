import { useEffect, useState } from 'react'
import api from '../../api/client'

export default function StatsBar({ theme = 'dark' }) {
  const [stats, setStats] = useState({
    teams: 0,
    tournaments: 0,
    stadiums: 0,
  })

  useEffect(() => {
    let active = true
    Promise.allSettled([
      api.get('/v1/stats').then((r) => r.data?.data || r.data),
      api.get('/v1/tournaments', { params: { per_page: 1 } }).then((r) => r.data),
    ]).then(([statsRes, toursRes]) => {
      if (!active) return

      const sData = statsRes.status === 'fulfilled' ? statsRes.value : {}
      const tData = toursRes.status === 'fulfilled' ? toursRes.value : {}

      const realTeams = sData.teams ?? sData.total_teams ?? 0
      const realStadiums = sData.stadiums ?? sData.total_stadiums ?? 0
      const realTournaments =
        sData.tournaments ??
        sData.total_tournaments ??
        tData.meta?.total ??
        (Array.isArray(tData.data) ? tData.data.length : 0)

      setStats({
        teams: Number(realTeams) || 0,
        tournaments: Number(realTournaments) || 0,
        stadiums: Number(realStadiums) || 0,
      })
    })

    return () => {
      active = false
    }
  }, [])

  // Filter out any stat equal to 0
  const activeItems = [
    { key: 'teams', label: 'فرق', value: stats.teams },
    { key: 'tournaments', label: 'بطولات', value: stats.tournaments },
    { key: 'stadiums', label: 'ملاعب', value: stats.stadiums },
  ].filter((item) => item.value > 0)

  // If all three numbers are 0: completely hide the bar (no gaps/empty space)
  if (activeItems.length === 0) {
    return null
  }

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  const gridColsClass =
    activeItems.length === 3
      ? 'grid-cols-3'
      : activeItems.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-1 max-w-xs'

  return (
    <section aria-label="إحصائيات المنصة" className="relative z-10 mx-auto w-full max-w-4xl px-4 sm:px-6 -mt-6 mb-4 sm:mb-6">
      <div
        className={`grid ${gridColsClass} divide-x divide-x-reverse rounded-2xl border p-3 sm:p-5 transition-all shadow-xl ${
          isDark
            ? 'bg-[#14221C] border-emerald-900/50 divide-emerald-900/40 text-slate-100'
            : 'bg-white border-slate-200 divide-slate-200 text-slate-900'
        }`}
      >
        {activeItems.map((item) => (
          <div key={item.key} className="flex flex-col items-center justify-center text-center px-2">
            <span
              className={`text-2xl sm:text-3xl md:text-4xl font-black font-mono tabular-nums ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {item.value}
            </span>
            <span
              className={`mt-1 text-xs sm:text-sm font-black whitespace-nowrap ${
                isDark ? 'text-emerald-400' : 'text-emerald-700'
              }`}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
