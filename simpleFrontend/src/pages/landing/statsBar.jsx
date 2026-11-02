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

  const gridColsClass =
    activeItems.length === 3
      ? 'grid-cols-3'
      : activeItems.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-1 max-w-xs'

  return (
    <section aria-label="إحصائيات المنصة" className="relative z-0 mx-auto w-full max-w-4xl px-4 sm:px-6 -mt-6 mb-4 sm:mb-6">
      <div
        className={`grid ${gridColsClass} divide-x divide-x-reverse rounded-2xl border p-3 sm:p-5 transition-all shadow-sm bg-white dark:bg-[#1B201D] border-[#E1E5DF] dark:border-[#303832] divide-[#E1E5DF] dark:divide-[#303832] text-[#111313] dark:text-[#F5F7F2]`}
      >
        {activeItems.map((item) => (
          <div key={item.key} className="flex flex-col items-center justify-center text-center px-2">
            <span
              className="text-2xl sm:text-3xl md:text-4xl font-black font-mono tabular-nums text-[#111313] dark:text-[#F5F7F2]"
            >
              {item.value}
            </span>
            <span
              className="mt-1 text-xs sm:text-sm font-black whitespace-nowrap text-[#16834A] dark:text-[#D0FF38]"
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
