import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import api from '../../api/client'
import TeamLogo from '../../components/profile/TeamLogo'
import FriendlyChallengeModal from '../../components/matches/FriendlyChallengeModal'

export default function RegisteredTeamsChallenge({ theme = 'dark' }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [challengeModalOpen, setChallengeModalOpen] = useState(false)

  // Touch Swipe Refs for Mobile Horizontal Swiping
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  useEffect(() => {
    let active = true
    api
      .get('/v1/registered-teams', { params: { per_page: 12 } })
      .then((res) => {
        if (!active) return
        const list = res.data?.data || []
        setTeams(list)
      })
      .catch(() => {
        if (active) setTeams([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const total = teams.length
  const currentTeam = teams[currentIndex] || null

  // Mobile Touch Handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX
  }

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current || total <= 1) return
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

  const handleChallengeClick = (team) => {
    if (!team?.manager_online) return
    setSelectedTeam(team)
    setChallengeModalOpen(true)
  }

  // Rule: Display section strictly if >= 1 team exists. If 0 teams or loading, hide completely.
  if (loading || teams.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="registered-teams-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-3 sm:my-4">
      {/* Outer Card with Stadium Atmosphere & Balanced Athletic Contrast */}
      <article
        className="relative overflow-hidden rounded-[28px] sm:rounded-[34px] border border-cyan-500/35 bg-[#0A161E] p-4 sm:p-6 text-white shadow-[0_16px_45px_rgba(6,182,212,0.18)] transition-all select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Cinematic Backdrop Texture & Lighting */}
        <div
          className="absolute inset-0 bg-cover bg-no-repeat pointer-events-none opacity-30 mix-blend-screen"
          style={{
            backgroundImage: 'url(/stadium-cinematic.png)',
            backgroundPosition: 'center 30%',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 85% 20%, rgba(6, 182, 212, 0.3) 0%, transparent 55%), radial-gradient(circle at 15% 20%, rgba(16, 185, 129, 0.25) 0%, transparent 55%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#08131B]/85 via-[#0A1822]/90 to-[#040C12]"
          aria-hidden="true"
        />

        {/* Header Row: Title, Subtitle & Crossed Swords Badge */}
        <div className="relative z-10 flex items-start justify-between gap-3 mb-4 sm:mb-5">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-black text-emerald-400">
                مباريات ودية وتحديات مباشرة
              </span>
            </div>
            <h2
              id="registered-teams-heading"
              className="text-sm sm:text-lg font-black text-white tracking-tight"
            >
              الفرق المسجلة على المنصة
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300/80 font-medium mt-0.5">
              تحدّ الفرق المعتمدة في مباريات ودية منظمة على ملاعب القرب
            </p>
          </div>

          <div className="size-11 sm:size-12 shrink-0 rounded-2xl bg-[#0F2D3D] border border-cyan-500/40 grid place-items-center shadow-lg shadow-cyan-950/50">
            <Swords className="size-5 sm:size-6 text-cyan-300 stroke-[2.2]" />
          </div>
        </div>

        {/* Featured Card Content */}
        {currentTeam && (
          <div className="relative z-10">
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#09151D]/85 p-4 sm:p-5 shadow-inner backdrop-blur-md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Team Info */}
                <div className="flex items-center gap-3.5 w-full sm:w-auto">
                  <div className="size-14 sm:size-18 shrink-0 rounded-2xl bg-white p-1.5 sm:p-2 shadow-md flex items-center justify-center overflow-hidden ring-1 ring-white/20">
                    {currentTeam.logo_url ? (
                      <img
                        src={currentTeam.logo_url}
                        alt={currentTeam.name}
                        className="size-full object-contain"
                      />
                    ) : (
                      <TeamLogo team={currentTeam} size="lg" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black text-white whitespace-nowrap drop-shadow-sm">
                        {currentTeam.name}
                      </h3>
                      {/* Real Presence Indicator */}
                      {currentTeam.manager_online ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 px-2.5 py-0.5 text-[10px] font-black text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>مسير الفريق متصل الآن</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                          <span className="size-1.5 rounded-full bg-slate-500" />
                          <span>مسير الفريق غير متصل</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                      <MapPin className="size-3 text-cyan-400 shrink-0" />
                      <span>{currentTeam.city}</span>
                      {currentTeam.manager?.name && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span>المسير: {currentTeam.manager.name}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Team KPIs */}
                <div className="flex items-center gap-3 sm:gap-4 shrink-0 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-center w-full sm:w-auto justify-around">
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400">المباريات</span>
                    <span className="text-xs sm:text-sm font-black text-white tabular-nums">{currentTeam.matches_played}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800" />
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400">الانتصارات</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-400 tabular-nums">{currentTeam.wins}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-800" />
                  <div>
                    <span className="block text-[10px] font-semibold text-slate-400">النقاط</span>
                    <span className="text-xs sm:text-sm font-black text-amber-400 tabular-nums">{currentTeam.points}</span>
                  </div>
                  {currentTeam.member_count > 0 && (
                    <>
                      <div className="w-px h-6 bg-slate-800" />
                      <div>
                        <span className="block text-[10px] font-semibold text-slate-400">اللاعبين</span>
                        <span className="text-xs sm:text-sm font-black text-sky-400 tabular-nums">{currentTeam.member_count}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Stadium & Location row */}
              {currentTeam.primary_stadium && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-emerald-400 shrink-0" />
                    <span className="font-bold">{currentTeam.primary_stadium.name}</span>
                    <span className="text-slate-500">({currentTeam.primary_stadium.city})</span>
                  </div>
                  {currentTeam.primary_stadium.player_format && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {currentTeam.primary_stadium.player_format}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action CTA Button */}
            <div className="mt-3.5 sm:mt-4">
              {currentTeam.manager_online ? (
                <button
                  type="button"
                  onClick={() => handleChallengeClick(currentTeam)}
                  className="w-full flex items-center justify-between py-3 sm:py-3.5 px-5 sm:px-6 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-white font-black text-xs sm:text-sm shadow-[0_10px_25px_rgba(16,185,129,0.35)] transition-all duration-300 hover:scale-[1.01] active:scale-98 cursor-pointer"
                >
                  <div className="size-7 sm:size-8 opacity-0" aria-hidden="true" />
                  <div className="flex items-center gap-2">
                    <Swords className="size-4" />
                    <span>تحدي في مباراة ودية</span>
                  </div>
                  <span className="size-7 sm:size-8 rounded-full bg-white/20 grid place-items-center text-white shrink-0">
                    <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 px-5 sm:px-6 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-400 font-bold text-xs sm:text-sm cursor-not-allowed opacity-75"
                  title="مسير الفريق غير متصل حالياً"
                >
                  <span>مسير الفريق غير متصل حالياً</span>
                  <span className="text-[10px] text-slate-500">(التحدي متاح عند اتصال المسير)</span>
                </button>
              )}
            </div>

            {/* Carousel Controls */}
            {total > 1 && (
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((p) => (p > 0 ? p - 1 : total - 1))}
                  className="grid size-8 place-items-center rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  aria-label="الفريق السابق"
                >
                  <ChevronRight className="size-4" />
                </button>

                {/* Pagination Dots */}
                <div className="flex items-center justify-center gap-1.5">
                  {teams.slice(0, 10).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        currentIndex === idx
                          ? 'w-6 bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                          : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                      }`}
                      aria-label={`فريق ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentIndex((p) => (p < total - 1 ? p + 1 : 0))}
                  className="grid size-8 place-items-center rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  aria-label="الفريق التالي"
                >
                  <ChevronLeft className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </article>

      {/* Friendly Match Challenge Modal */}
      <FriendlyChallengeModal
        open={challengeModalOpen}
        onClose={() => setChallengeModalOpen(false)}
        targetTeam={selectedTeam}
      />
    </section>
  )
}
