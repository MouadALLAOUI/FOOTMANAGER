import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  CheckCircle2,
  ChevronLeft,
  Crown,
  Flame,
  MapPin,
  Star,
  Target,
  Trophy,
} from 'lucide-react'
import api from '../../api/client'
import { formatPlayerPosition } from '../../lib/adapters'

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

  // Hide entirely if no player selected by committee or still loading
  if (!topPlayer || loading) {
    return null
  }

  const profile = topPlayer?.profile || topPlayer || {}
  const playerId = profile.id || topPlayer.id || topPlayer.user_id
  const playerName = profile.user?.name || profile.name || 'لاعب معتمد'
  const teamName = profile.team?.name || 'فريق رياضي'
  const venueOrCity = profile.stadium || profile.city || 'المغرب'
  const position = formatPlayerPosition(profile.position) || 'لاعب وسط'
  const photoUrl = profile.photo_url || profile.avatar_url || '/player-star.png'

  const goals = profile.goals ?? 0
  const assists = profile.assists ?? 0
  const matches = profile.matches_played ?? 0

  // Strict data integrity: do not display contradictory stats (goals without matches) or unconfirmed players
  if ((goals > 0 && matches === 0) || matches === 0) {
    return null
  }

  const rating = profile.rating
    ? Number(profile.rating).toFixed(1)
    : profile.avg_rating
    ? Number(profile.avg_rating).toFixed(1)
    : '—'

  return (
    <section aria-labelledby="player-of-the-week-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-3 sm:my-4">
      {/* Light Mint / Crisp White Container matching reference mockup */}
      <article className="relative overflow-hidden rounded-[28px] sm:rounded-[34px] border border-emerald-200/80 bg-[#EDF8F3] p-4 sm:p-6 text-slate-900 shadow-xl transition-all select-none">
        {/* Subtle Ambient Radial Highlight */}
        <div
          className="pointer-events-none absolute -top-12 -start-12 size-48 rounded-full blur-3xl opacity-35 bg-emerald-300"
          aria-hidden="true"
        />

        {/* 1. Header Row: Amber Crown, Title, Subtitle & Mint Badge */}
        <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
          <div>
            <div className="flex items-center gap-1.5 text-amber-700 mb-0.5">
              <Crown className="size-4 fill-amber-500 text-amber-500" />
              <span className="text-xs font-black uppercase tracking-wider">
                صدارة الترتيب
              </span>
            </div>
            <h2
              id="player-of-the-week-heading"
              className="text-sm sm:text-lg font-black text-[#14221C] tracking-tight"
            >
              نجم الأسبوع وهداف البطولة
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5">
              أفضل أداء بين جميع اللاعبين
            </p>
          </div>

          {/* Mint/Emerald First Rank Pill Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 border border-emerald-300/80 px-3.5 py-1 text-xs font-black text-emerald-800 shadow-2xs shrink-0">
            <Flame className="size-3.5 fill-emerald-500 text-emerald-500" />
            <span>المرتبة الأولى</span>
          </span>
        </div>

        {/* 2. Middle Player Info Row */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 py-2.5 border-y border-emerald-900/10">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Player Avatar with native #1 Golden Badge */}
            <div className="relative size-16 sm:size-20 shrink-0 rounded-2xl bg-[#0F291E] border-2 border-emerald-400 shadow-md overflow-hidden flex items-center justify-center">
              <img
                src={photoUrl}
                alt={playerName}
                className="size-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/player-star.png'
                }}
              />
            </div>

            {/* Name, Position, Team & Venue */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-base font-black text-[#14221C] whitespace-nowrap">
                  {playerName}
                </h3>
                <CheckCircle2 className="size-4 text-emerald-600 fill-emerald-500/20 shrink-0" />
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-emerald-700 mt-0.5 whitespace-nowrap">
                <span>{position}</span> • <span className="text-slate-600">{teamName}</span>
              </p>
              <p className="text-[11px] sm:text-xs font-medium text-slate-600 mt-0.5 flex items-center gap-1 truncate">
                <MapPin className="size-3.5 text-rose-500 shrink-0" />
                <span className="truncate">{venueOrCity}</span>
              </p>
            </div>
          </div>

          {/* Action Navigation and Track Stats Button */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Link
              to={playerId ? `/players/${playerId}` : '/matches'}
              className="size-7 sm:size-8 rounded-full bg-slate-100 border border-slate-200/80 grid place-items-center text-slate-600 hover:bg-slate-200 transition-colors shadow-2xs"
              aria-label="عرض تفاصيل اللاعب"
            >
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </Link>

            <Link
              to={playerId ? `/players/${playerId}` : '/matches'}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 hover:bg-emerald-200/90 border border-emerald-300 text-emerald-800 px-3 py-1 text-[11px] sm:text-xs font-black shadow-xs transition-colors"
            >
              <Trophy className="size-3 sm:size-3.5 text-emerald-700" />
              <span className="whitespace-nowrap">تتبع إحصائيات اللاعبين</span>
            </Link>
          </div>
        </div>

        {/* 3. Bottom 4 Stats Cards in Row */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-3.5 sm:mt-4 text-center">
          {/* Goals */}
          <div className="rounded-2xl bg-white p-2 sm:p-2.5 border border-slate-200/70 shadow-xs flex flex-col items-center justify-center">
            <span className="text-base sm:text-xl font-black text-emerald-800 tabular-nums">
              {goals}
            </span>
            <div className="flex items-center gap-1 mt-0.5 text-slate-600">
              <Flame className="size-3 text-emerald-600" />
              <span className="text-[10px] sm:text-[11px] font-bold">الأهداف</span>
            </div>
          </div>

          {/* Assists */}
          <div className="rounded-2xl bg-white p-2 sm:p-2.5 border border-slate-200/70 shadow-xs flex flex-col items-center justify-center">
            <span className="text-base sm:text-xl font-black text-emerald-800 tabular-nums">
              {assists}
            </span>
            <div className="flex items-center gap-1 mt-0.5 text-slate-600">
              <Target className="size-3 text-emerald-600" />
              <span className="text-[10px] sm:text-[11px] font-bold truncate">التمريرات الحاسمة</span>
            </div>
          </div>

          {/* Matches */}
          <div className="rounded-2xl bg-white p-2 sm:p-2.5 border border-slate-200/70 shadow-xs flex flex-col items-center justify-center">
            <span className="text-base sm:text-xl font-black text-emerald-800 tabular-nums">
              {matches}
            </span>
            <div className="flex items-center gap-1 mt-0.5 text-slate-600">
              <Activity className="size-3 text-emerald-600" />
              <span className="text-[10px] sm:text-[11px] font-bold">المباريات</span>
            </div>
          </div>

          {/* Rating */}
          <div className="rounded-2xl bg-white p-2 sm:p-2.5 border border-slate-200/70 shadow-xs flex flex-col items-center justify-center">
            <span className="text-base sm:text-xl font-black text-emerald-800 tabular-nums">
              {rating}
            </span>
            <div className="flex items-center gap-1 mt-0.5 text-slate-600">
              <Star className="size-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] sm:text-[11px] font-bold">التقييم</span>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}
