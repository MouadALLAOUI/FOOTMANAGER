import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Swords,
  Zap,
} from 'lucide-react'
import api from '../../api/client'
import TeamLogo from '../../components/profile/TeamLogo'

export default function ChallengesWall({ theme = 'dark' }) {
  const [challenges, setChallenges] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Touch Swipe Refs for Mobile Horizontal Swiping
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => {
    let active = true
    api
      .get('/v1/matches', { params: { status: 'open', per_page: 10 } })
      .then((res) => {
        if (!active) return
        const list = res.data?.data || res.data || []
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

  // Realistic fallback challenge strictly matching user's reference mockup
  const fallbackChallenge = {
    id: 'demo-challenge-1',
    match_datetime: '2026-09-14T22:00:00',
    host_team: {
      name: 'شباب المدينة',
      city: 'الرباط',
      logo_url: '/team_sample_athletic.png',
    },
    opponent_team: {
      name: 'نجوم تغيير',
      city: 'الدار البيضاء',
      logo_url: '/team_sample_tree.png',
    },
    stadium: {
      name: 'ملعب معتمد',
      city: 'الدار البيضاء',
    },
  }

  const activeChallenges = challenges.length > 0 ? challenges : [fallbackChallenge]
  const currentChallenge = activeChallenges[currentIndex] || activeChallenges[0]
  const total = activeChallenges.length

  const host = currentChallenge.host_team || currentChallenge.team || {
    name: 'شباب المدينة',
    city: 'الرباط',
    logo_url: '/team_sample_athletic.png',
  }
  const opponent = currentChallenge.opponent_team || {
    name: 'نجوم تغيير',
    city: 'الدار البيضاء',
    logo_url: '/team_sample_tree.png',
  }
  const stadiumName = currentChallenge.stadium?.name || currentChallenge.terrain_name || 'ملعب معتمد'
  const city = currentChallenge.stadium?.city || currentChallenge.city || host.city || 'الدار البيضاء'

  // Format Date and Time in Arabic
  const formatChallengeDate = (dt) => {
    if (!dt) return 'الاثنين 14 شتنبر'
    try {
      const d = new Date(dt)
      if (isNaN(d.getTime())) return 'الاثنين 14 شتنبر'
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر']
      return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
    } catch {
      return 'الاثنين 14 شتنبر'
    }
  }

  const formatChallengeTime = (dt) => {
    if (!dt) return '22:00'
    try {
      const d = new Date(dt)
      if (isNaN(d.getTime())) return '22:00'
      return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return '22:00'
    }
  }

  // Mobile Touch Handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const diff = touchStartX.current - touchEndX.current
    const isRtl = document.documentElement.dir === 'rtl'

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swiped left
        if (isRtl) {
          setCurrentIndex((p) => (p > 0 ? p - 1 : total - 1))
        } else {
          setCurrentIndex((p) => (p < total - 1 ? p + 1 : 0))
        }
      } else {
        // Swiped right
        if (isRtl) {
          setCurrentIndex((p) => (p < total - 1 ? p + 1 : 0))
        } else {
          setCurrentIndex((p) => (p > 0 ? p - 1 : total - 1))
        }
      }
    }
    touchStartX.current = 0
    touchEndX.current = 0
  }

  return (
    <section aria-labelledby="challenges-wall-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-3 sm:my-4">
      {/* Outer Card with Stadium Cinematic Atmosphere & Radial Lighting */}
      <article
        className="relative overflow-hidden rounded-[28px] sm:rounded-[34px] border border-cyan-500/35 bg-[#0A161E] p-4 sm:p-6 text-white shadow-[0_16px_45px_rgba(6,182,212,0.18)] transition-all select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Layer 1: Stadium Cinematic Texture */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat pointer-events-none opacity-40 mix-blend-screen"
          style={{
            backgroundImage: 'url(/stadium-cinematic.png)',
            backgroundPosition: 'center 30%',
          }}
          aria-hidden="true"
        />

        {/* Layer 2: Cyan & Emerald Radial Lighting */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.35) 0%, transparent 55%), radial-gradient(circle at 15% 20%, rgba(16, 185, 129, 0.25) 0%, transparent 55%)',
          }}
          aria-hidden="true"
        />

        {/* Layer 3: Dark Vignette for Readability */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#08131B]/80 via-[#0A1822]/90 to-[#040C12]"
          aria-hidden="true"
        />

        {/* Functional Content */}
        <div className="relative z-10">
          {/* Header Row: Live Badge, Title, Subtitle & Crossed Swords Squircle */}
          <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
            <div>
              {/* Live Challenge Indicator */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-black text-rose-500">
                  تحديات مباشرة
                </span>
              </div>
              <h2
                id="challenges-wall-heading"
                className="text-sm sm:text-lg font-black text-white tracking-tight"
              >
                حائط التحديات الرياضية (مباريات بانتظار المنافس)
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-300/80 font-medium mt-0.5">
                انضم إلى التحديات المفتوحة وواجه فرق جديدة
              </p>
            </div>

            {/* Squircle Crossed Swords Icon Badge */}
            <div className="size-11 sm:size-12 shrink-0 rounded-2xl bg-[#3A1024] border border-rose-500/40 grid place-items-center shadow-lg shadow-rose-950/50">
              <Swords className="size-5 sm:size-6 text-rose-400 stroke-[2.2]" />
            </div>
          </div>

          {/* Central Matchup Box */}
          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#09151D]/85 p-3.5 sm:p-5 shadow-inner backdrop-blur-md">
            {/* Teams Matchup Row: Host Team, VS, Opponent Team */}
            <div className="flex items-center justify-between gap-1 sm:gap-4 text-center">
              {/* Host Team (Right in RTL) */}
              <div className="flex items-center gap-2 sm:gap-3 justify-end text-end flex-1 min-w-0">
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-white whitespace-nowrap drop-shadow-sm">
                    {host.name || 'شباب المدينة'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                    {host.city || 'الرباط'}
                  </p>
                </div>
                <div className="size-12 sm:size-16 shrink-0 rounded-2xl bg-white p-1.5 sm:p-2 shadow-md flex items-center justify-center overflow-hidden ring-1 ring-white/20">
                  {host.logo_url ? (
                    <img
                      src={host.logo_url}
                      alt={host.name}
                      className="size-full object-contain"
                    />
                  ) : (
                    <TeamLogo team={host} size="sm" />
                  )}
                </div>
              </div>

              {/* Glowing VS in Center */}
              <div className="shrink-0 px-2 sm:px-4 flex flex-col items-center justify-center">
                <span className="text-xl sm:text-3xl font-black font-sans tracking-wider text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.75)]">
                  VS
                </span>
              </div>

              {/* Opponent Team (Left in RTL) */}
              <div className="flex items-center gap-2 sm:gap-3 justify-start text-start flex-1 min-w-0">
                <div className="size-12 sm:size-16 shrink-0 rounded-2xl bg-white p-1.5 sm:p-2 shadow-md flex items-center justify-center overflow-hidden ring-1 ring-white/20">
                  {opponent.logo_url ? (
                    <img
                      src={opponent.logo_url}
                      alt={opponent.name}
                      className="size-full object-contain"
                    />
                  ) : (
                    <TeamLogo team={opponent} size="sm" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black text-white whitespace-nowrap drop-shadow-sm">
                    {opponent.name || 'نجوم تغيير'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                    {opponent.city || 'الدار البيضاء'}
                  </p>
                </div>
              </div>
            </div>

            {/* Logistics Row: Date, Time, Venue with Verification */}
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] sm:text-xs text-slate-300">
              {/* Date */}
              <div className="flex items-center gap-1.5 min-w-0">
                <CalendarDays className="size-3.5 sm:size-4 text-emerald-400 shrink-0" />
                <span className="font-bold truncate">
                  {formatChallengeDate(currentChallenge.match_datetime)}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center gap-1.5 min-w-0 px-2">
                <Clock className="size-3.5 sm:size-4 text-emerald-400 shrink-0" />
                <span className="font-bold tabular-nums font-mono">
                  {formatChallengeTime(currentChallenge.match_datetime)}
                </span>
              </div>

              {/* Venue & City with Verified Badge */}
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="size-3.5 sm:size-4 text-emerald-400 shrink-0" />
                <span className="font-bold truncate">{stadiumName}</span>
                <CheckCircle2 className="size-3.5 text-emerald-400 fill-emerald-400/20 shrink-0" />
                <span className="text-slate-400 truncate hidden xs:inline">{city}</span>
              </div>
            </div>
          </div>

          {/* Full-Width Glowing Emerald CTA Button */}
          <div className="mt-3.5 sm:mt-4">
            <Link
              to={`/matches?challenge=${currentChallenge.id || ''}&teamName=${encodeURIComponent(host.name || '')}`}
              className="w-full flex items-center justify-between py-3 sm:py-3.5 px-5 sm:px-6 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-white font-black text-xs sm:text-sm shadow-[0_10px_25px_rgba(16,185,129,0.35)] transition-all duration-300 hover:scale-[1.01] active:scale-98 cursor-pointer"
            >
              <div className="size-7 sm:size-8 opacity-0" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span>قبول التحدي 🤝</span>
              </div>
              <span className="size-7 sm:size-8 rounded-full bg-white/20 grid place-items-center text-white shrink-0">
                <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
              </span>
            </Link>
          </div>

          {/* Carousel Pagination Dots if multiple challenges exist */}
          {total > 1 && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {activeChallenges.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    currentIndex === idx
                      ? 'w-6 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                      : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                  }`}
                  aria-label={`التحدي ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </article>
    </section>
  )
}
