import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Landmark,
  Loader2,
  MapPin,
  Search,
  Shield,
  Sparkles,
  Target,
  Trophy,
  User,
  X,
} from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { formatPlayerPosition } from '../../lib/adapters'
import MainHeader from './header'

export default function HeroSection({ theme = 'dark', onSearchSubmit, onToggleTheme }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [liveCount, setLiveCount] = useState(0)

  // Live Auto-suggest states
  const [suggestions, setSuggestions] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestOpen, setSuggestOpen] = useState(false)
  const searchContainerRef = useRef(null)
  const inputRef = useRef(null)

  // Fetch real in-progress matches
  useEffect(() => {
    let active = true
    api
      .get('/v1/live-tournament-matches')
      .then((res) => {
        if (!active) return
        const liveList = res.data?.data?.live || []
        setLiveCount(liveList.length)
      })
      .catch(() => {
        api
          .get('/v1/stats')
          .then((sRes) => {
            if (!active) return
            const count = sRes.data?.data?.live_matches ?? sRes.data?.live_matches ?? 0
            setLiveCount(count)
          })
          .catch(() => {})
      })

    return () => {
      active = false
    }
  }, [])

  // Live Auto-suggest effect (Trigger on 1st character with 180ms debounce)
  useEffect(() => {
    const q = searchTerm.trim()
    if (q.length < 1) {
      setSuggestions(null)
      setSuggestOpen(false)
      return
    }

    setSuggestLoading(true)
    setSuggestOpen(true)

    const timer = setTimeout(() => {
      api
        .get('/search/suggest', { params: { q } })
        .then((res) => {
          const d = res.data?.data || res.data || {}
          setSuggestions(d)
        })
        .catch(() => {
          // Fallback to general search endpoint
          api
            .get('/search', { params: { q, limit: 3 } })
            .then((res2) => {
              const d2 = res2.data?.data || res2.data || {}
              setSuggestions(d2)
            })
            .catch(() => {
              setSuggestions(null)
            })
        })
        .finally(() => {
          setSuggestLoading(false)
        })
    }, 180)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Close suggestions when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSuggestOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSuggestOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside, { passive: true })
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!searchTerm.trim()) return
    setSuggestOpen(false)
    if (onSearchSubmit) {
      onSearchSubmit(searchTerm)
    } else {
      navigate(`/fields?search=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const handleSelectSuggestion = (type, item) => {
    setSuggestOpen(false)
    if (type === 'tournament') {
      navigate(`/tournaments/${item.slug || item.id}`)
    } else if (type === 'stadium') {
      navigate(`/fields?search=${encodeURIComponent(item.name)}`)
    } else if (type === 'team') {
      navigate(`/matches?team=${encodeURIComponent(item.name)}`)
    } else if (type === 'player') {
      navigate(`/players/${item.id}`)
    }
  }

  // Proper Arabic plural rules for live matches
  const formatLiveMatchesText = (count) => {
    if (count <= 0) return ''
    if (count === 1) return 'مباراة واحدة مباشرة الآن'
    if (count === 2) return 'مباراتان مباشرتان الآن'
    if (count >= 3 && count <= 10) return `${count} مباريات مباشرة الآن`
    return `${count} مباراة مباشرة الآن`
  }

  // Organize tournament link: opens wizard or login if guest
  const organizeTournamentLink = user
    ? '/committee/tournaments/wizard'
    : '/login?redirect=' + encodeURIComponent('/committee/tournaments/wizard')

  const hasSuggestions =
    suggestions &&
    ((suggestions.tournaments && suggestions.tournaments.length > 0) ||
      (suggestions.players && suggestions.players.length > 0) ||
      (suggestions.teams && suggestions.teams.length > 0) ||
      (suggestions.stadiums && suggestions.stadiums.length > 0))

  return (
    <section
      aria-label="مقدمة المنصة"
      className={`relative flex w-full max-w-full flex-col items-center justify-start overflow-visible text-center rounded-b-[24px] transition-[z-index] ${
        suggestOpen ? 'z-30' : 'z-0'
      }`}
    >
      {/* 1. Background Picture */}
      <picture className="absolute inset-0 size-full overflow-hidden rounded-b-[24px]">
        <source srcSet="/hero-morocco-800w.webp" media="(max-width: 640px)" type="image/webp" />
        <source srcSet="/hero-morocco-1600w.webp" media="(min-width: 641px)" type="image/webp" />
        <img
          src="/hero-morocco-1600w.webp"
          srcSet="/hero-morocco-800w.webp 800w, /hero-morocco-1600w.webp 1600w"
          sizes="100vw"
          alt="مباراة كرة قدم عند غروب الشمس في واحة بجنوب المغرب"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          style={{ objectPosition: '50% 30%' }}
          className="size-full object-cover"
        />
      </picture>

      {/* 2. Lightened Linear Gradient Overlay: 20% at top to 85% at bottom */}
      <div
        className="absolute inset-0 pointer-events-none z-1 bg-gradient-to-b from-[#0F3D2E]/20 via-[#0F3D2E]/50 to-[#0F3D2E]/85 rounded-b-[24px]"
        aria-hidden="true"
      />

      {/* 3. Integrated Platform Header (Transparent, directly over the mountain sunset sky) */}
      <div className="relative z-30 w-full">
        <MainHeader theme={theme} onToggleTheme={onToggleTheme} transparent={true} />
      </div>

      {/* 4. Hero Interactive Content */}
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center px-4 pt-3 pb-8 sm:pt-6 sm:pb-14">
        {/* Live Matches Badge */}
        {liveCount > 0 && (
          <div className="flex items-center justify-center mb-3 sm:mb-6">
            <Link
              to="/matches"
              className="group inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs sm:text-sm font-black transition-all active:scale-95 bg-rose-500/25 border border-rose-400/50 text-rose-200 hover:bg-rose-500/35 shadow-md"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-85" />
                <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
              </span>
              <span>{formatLiveMatchesText(liveCount)}</span>
            </Link>
          </div>
        )}

        {/* Title in White with soft text shadow */}
        <h1
          style={{ textShadow: '0 2px 12px rgba(0,0,0,0.45)' }}
          className="leading-tight sm:leading-snug max-w-3xl tracking-tight text-white"
        >
          <span className="block text-[23px] xs:text-3xl sm:text-5xl md:text-6xl font-black">
            الكرة تجمعنا...
          </span>
          <span className="block mt-1 sm:mt-3 text-lg xs:text-2xl sm:text-4xl md:text-5xl font-black">
            مباريات محلية بنكهة احترافية.
          </span>
        </h1>

        {/* Subtitle with text-wrap: balance */}
        <p
          style={{
            textShadow: '0 2px 12px rgba(0,0,0,0.45)',
            textWrap: 'balance',
          }}
          className="mt-2 sm:mt-4 max-w-xl text-[13px] xs:text-[14px] sm:text-[15px] leading-relaxed font-bold text-white/90"
        >
          كل ما يحتاجه المنظّم واللاعب في مكان واحد، وبأداء احترافي.
        </p>

        {/* CTA Buttons */}
        <div className="mt-4 sm:mt-8 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 w-full max-w-md">
          <Link
            to="/stadiums"
            className="flex-1 min-w-[130px] h-11 sm:h-13 flex items-center justify-center rounded-full bg-[#1F7A4D] hover:bg-[#1A6841] px-5 sm:px-6 text-xs sm:text-base font-black text-white shadow-xl shadow-black/25 transition-all hover:scale-[1.02] active:scale-98"
          >
            احجز ملعبك
          </Link>

          <Link
            to={organizeTournamentLink}
            className="flex-1 min-w-[130px] h-11 sm:h-13 flex items-center justify-center rounded-full border-2 border-white text-white bg-transparent hover:bg-white/15 active:bg-white/20 font-black text-xs sm:text-base transition-all hover:scale-[1.02] active:scale-98 shadow-md shadow-black/20"
          >
            نظّم بطولة
          </Link>
        </div>

        {/* 4. Smart Search Bar with Flexible Responsive Sizing & Subtle Focus */}
        <div ref={searchContainerRef} className="relative z-30 mt-3.5 sm:mt-6 w-full max-w-lg mx-auto">
          <form onSubmit={handleSearch} role="search">
            <div className="relative flex h-12 sm:h-13 w-full items-center rounded-2xl bg-white ps-3.5 sm:ps-4 pe-20 sm:pe-24 border border-slate-200/90 shadow-md shadow-black/10 transition-all duration-200 focus-within:border-emerald-500/70 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:shadow-[0_4px_24px_rgba(16,185,129,0.18)]">
              {/* Text Input with RTL Alignment & iOS zoom prevention (16px) */}
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={suggestOpen}
                aria-controls="search-suggestions-popover"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  if (e.target.value.trim().length >= 1) {
                    setSuggestOpen(true)
                  }
                }}
                onFocus={() => {
                  if (searchTerm.trim().length >= 1) setSuggestOpen(true)
                }}
                placeholder="ابحث عن بطولة، فريق، لاعب، أو ملعب..."
                aria-label="ابحث عن بطولة، فريق، لاعب، أو ملعب"
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                className="h-full w-full bg-transparent text-[16px] sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none text-start"
              />

              {/* Action Buttons on Left in RTL (end-*) */}
              {suggestLoading ? (
                <div className="absolute end-12 sm:end-13 grid size-7 place-items-center text-emerald-600">
                  <Loader2 className="size-4 animate-spin" />
                </div>
              ) : searchTerm.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setSuggestOpen(false)
                    inputRef.current?.focus()
                  }}
                  aria-label="مسح البحث"
                  className="absolute end-12 sm:end-13 grid size-7 place-items-center rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              ) : null}

              {/* Green Circular Search Button */}
              <button
                type="submit"
                aria-label="بدء البحث"
                className="absolute end-1.5 sm:end-2 grid size-9 sm:size-10 place-items-center rounded-xl bg-[#1F7A4D] hover:bg-[#1A6841] text-white shadow-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Search className="size-4 sm:size-4.5" />
              </button>
            </div>
          </form>

          {/* 5. Floating Live Auto-Suggest Popover - Floats strictly on top of Statistics Bar (z-40) */}
          {suggestOpen && searchTerm.trim().length >= 1 && (
            <div
              id="search-suggestions-popover"
              role="listbox"
              className="absolute top-full inset-x-0 mt-2 z-40 rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white text-slate-900 shadow-2xl overflow-hidden text-start animate-in fade-in duration-150"
            >
              {suggestLoading && !hasSuggestions ? (
                <div className="flex items-center justify-center gap-2 py-6 text-xs font-bold text-slate-500">
                  <Loader2 className="size-4 animate-spin text-emerald-600" />
                  <span>جاري البحث الفوري...</span>
                </div>
              ) : !hasSuggestions ? (
                <div className="py-5 px-4 text-center text-xs text-slate-500 font-bold">
                  لا توجد نتائج مطابقة لـ "{searchTerm}"
                </div>
              ) : (
                <div className="max-h-[min(52dvh,340px)] overflow-y-auto overscroll-contain divide-y divide-slate-100 p-2 text-start">
                  {/* قسم اللاعبين (Matching Reference Image) */}
                  {suggestions.players && suggestions.players.length > 0 && (
                    <div className="py-1.5">
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-black text-emerald-700 tracking-wider">
                        <User className="size-3.5 text-emerald-600" />
                        <span>اللاعبون</span>
                      </div>
                      {suggestions.players.map((pl) => (
                        <button
                          key={`pl-${pl.id}`}
                          type="button"
                          onClick={() => handleSelectSuggestion('player', pl)}
                          className="group flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 sm:p-3 text-start hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Player Avatar with Fallback Monogram */}
                            <div className="relative size-10 sm:size-11 shrink-0 overflow-hidden rounded-full border border-slate-200/80 bg-slate-100 grid place-items-center shadow-xs">
                              {pl.photo_thumbnail_url || pl.photo_url ? (
                                <img
                                  src={pl.photo_thumbnail_url || pl.photo_url}
                                  alt={pl.name}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                  }}
                                />
                              ) : null}
                              <span
                                className={`text-slate-500 text-xs font-black ${
                                  pl.photo_thumbnail_url || pl.photo_url ? 'hidden' : ''
                                }`}
                              >
                                {pl.name ? pl.name.trim().charAt(0) : 'ل'}
                              </span>
                            </div>

                            {/* Player Info Column */}
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                                {pl.name}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                                {pl.team?.name
                                  ? `لاعب · ${pl.team.name}`
                                  : pl.position
                                  ? `لاعب · ${formatPlayerPosition(pl.position)}`
                                  : 'لاعب مسجل بالمنصة'}
                              </span>
                            </div>
                          </div>

                          {/* Left Chevron Indicator */}
                          <ChevronLeft className="size-4 text-slate-400 group-hover:text-slate-600 group-hover:-translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* قسم الفرق */}
                  {suggestions.teams && suggestions.teams.length > 0 && (
                    <div className="py-1.5">
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-black text-sky-700 tracking-wider">
                        <Shield className="size-3.5 text-sky-600" />
                        <span>الفرق</span>
                      </div>
                      {suggestions.teams.map((tm) => (
                        <button
                          key={`tm-${tm.id}`}
                          type="button"
                          onClick={() => handleSelectSuggestion('team', tm)}
                          className="group flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 sm:p-3 text-start hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-700 border border-sky-100 shadow-xs">
                              {tm.logo_url || tm.logo_path ? (
                                <img
                                  src={tm.logo_url || tm.logo_path}
                                  alt={tm.name}
                                  className="size-full rounded-2xl object-cover"
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                              ) : (
                                <Shield className="size-5 text-sky-600" />
                              )}
                            </div>
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-black text-slate-900 group-hover:text-sky-700 transition-colors truncate">
                                {tm.name}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                                {tm.city ? `فريق · ${tm.city}` : 'فريق كرة قدم معتمد'}
                              </span>
                            </div>
                          </div>
                          <ChevronLeft className="size-4 text-slate-400 group-hover:text-slate-600 group-hover:-translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* قسم البطولات */}
                  {suggestions.tournaments && suggestions.tournaments.length > 0 && (
                    <div className="py-1.5">
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-black text-amber-700 tracking-wider">
                        <Trophy className="size-3.5 text-amber-600" />
                        <span>البطولات</span>
                      </div>
                      {suggestions.tournaments.map((tour) => (
                        <button
                          key={`tour-${tour.id}`}
                          type="button"
                          onClick={() => handleSelectSuggestion('tournament', tour)}
                          className="group flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 sm:p-3 text-start hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100 shadow-xs">
                              <Trophy className="size-5 text-amber-600" />
                            </div>
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-black text-slate-900 group-hover:text-amber-700 transition-colors truncate">
                                {tour.name}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                                {tour.location ? `بطولة · ${tour.location}` : 'دوري كرة قدم'}
                              </span>
                            </div>
                          </div>
                          <ChevronLeft className="size-4 text-slate-400 group-hover:text-slate-600 group-hover:-translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* قسم ملاعب القرب */}
                  {suggestions.stadiums && suggestions.stadiums.length > 0 && (
                    <div className="py-1.5">
                      <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-black text-teal-700 tracking-wider">
                        <Landmark className="size-3.5 text-teal-600" />
                        <span>ملاعب القرب</span>
                      </div>
                      {suggestions.stadiums.map((std) => (
                        <button
                          key={`std-${std.id}`}
                          type="button"
                          onClick={() => handleSelectSuggestion('stadium', std)}
                          className="group flex w-full items-center justify-between gap-3 rounded-2xl p-2.5 sm:p-3 text-start hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid size-10 sm:size-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-100 shadow-xs">
                              <Landmark className="size-5 text-teal-600" />
                            </div>
                            <div className="min-w-0 flex flex-col">
                              <span className="text-sm font-black text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                                {std.name}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                                {std.city ? `ملعب قرب · ${std.city}` : 'ملعب متاح للحجز'}
                              </span>
                            </div>
                          </div>
                          <ChevronLeft className="size-4 text-slate-400 group-hover:text-slate-600 group-hover:-translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* تذييل زر البحث الكامل */}
                  <div className="pt-2 pb-1 px-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSearch}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 text-xs font-black transition-colors cursor-pointer"
                    >
                      <Search className="size-3.5" />
                      <span>عرض جميع النتائج لـ "{searchTerm}"</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
