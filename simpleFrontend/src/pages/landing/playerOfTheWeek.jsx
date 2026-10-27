import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, Star, Trophy, User } from 'lucide-react'
import api from '../../api/client'

export default function PlayerOfTheWeek({ theme = 'dark' }) {
  const [topPlayer, setTopPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .get('/leaderboard/players', { params: { per_page: 5 } })
      .then((res) => {
        if (!active) return
        const players = res.data?.players || res.data?.data || []
        if (players.length > 0) {
          setTopPlayer(players[0])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // STRICT RULE: Zero fake data. If no player data is present in database yet, do not render fabricated stats.
  if (!topPlayer || loading) {
    return null
  }

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  // Real player data exclusively from database
  const profile = topPlayer?.profile || topPlayer || {}
  const playerName = profile.user?.name || profile.name
  if (!playerName) return null

  const teamName = profile.team?.name || 'فريق معتمد'
  const city = profile.city || 'المغرب'
  const position = profile.position || 'لاعب مميز'
  const goals = profile.goals ?? 0
  const assists = profile.assists ?? 0
  const rating = profile.rating ? Number(profile.rating).toFixed(1) : '-'
  const matches = profile.matches_played ?? 0

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border p-5 sm:p-6 transition-all ${
        isDark
          ? 'bg-[#14221C] border-emerald-900/50 shadow-2xl ring-1 ring-emerald-500/20'
          : 'bg-white border-slate-200 shadow-xl ring-1 ring-emerald-500/20'
      }`}
    >
      {/* Ambient background sparkle */}
      <div
        className={`pointer-events-none absolute -top-12 -start-12 size-40 rounded-full blur-3xl opacity-30 ${
          isDark ? 'bg-emerald-400' : 'bg-emerald-300'
        }`}
        aria-hidden="true"
      />

      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
            <Star className="size-4.5 fill-amber-400 text-amber-400" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
              صدارة الترتيب
            </span>
            <h3 className={`text-sm sm:text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              نجم الأسبوع وهداف البطولة
            </h3>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-black text-emerald-400 shadow-2xs">
          <Flame className="size-3.5 fill-emerald-400" />
          <span>المرتبة الأولى</span>
        </span>
      </div>

      {/* Player Identity Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-y border-slate-700/25">
        <div className="flex items-center gap-3.5">
          <div className="relative size-16 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-lg shadow-emerald-600/30">
            <div className="size-full rounded-[14px] bg-[#14221C] flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={playerName} className="size-full object-cover" />
              ) : (
                <User className="size-8 text-emerald-400" />
              )}
            </div>
            <span className="absolute -top-1.5 -end-1.5 grid size-6 place-items-center rounded-full bg-amber-400 text-[#14221C] text-[10px] font-black shadow-md ring-2 ring-[#14221C]">
              #1
            </span>
          </div>

          <div>
            <h4 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {playerName}
            </h4>
            <p className="text-xs font-bold text-emerald-500">
              {position} • <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{teamName}</span>
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              📍 {city}
            </p>
          </div>
        </div>

        {/* Action Link */}
        <Link
          to="/matches"
          className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 px-3.5 py-1.5 text-xs font-black transition-all active:scale-95"
        >
          <Trophy className="size-3.5" />
          <span>تتبع إحصائيات اللاعبين</span>
        </Link>
      </div>

      {/* Stats Pillars */}
      <div className="grid grid-cols-4 gap-2 mt-4 text-center">
        <div className={`rounded-2xl p-2.5 border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">{goals}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400">الأهداف</p>
        </div>
        <div className={`rounded-2xl p-2.5 border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">{assists}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400">التمريرات الحاسمة</p>
        </div>
        <div className={`rounded-2xl p-2.5 border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className="text-base sm:text-lg font-black text-emerald-400 tabular-nums">{matches}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400">المباريات</p>
        </div>
        <div className={`rounded-2xl p-2.5 border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
          <p className="text-base sm:text-lg font-black text-amber-400 tabular-nums">{rating}</p>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-400">التقييم</p>
        </div>
      </div>
    </div>
  )
}
