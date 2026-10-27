import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Clock,
  Flame,
  MapPin,
  Radio,
  Share2,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import { toBlob } from 'html-to-image'
import api from '../../api/client'
import TeamLogo from '../../components/profile/TeamLogo'
import { useToast } from '../../components/ui/Toast'

// Dynamic Quad-Coloring Palettes (متناسقة تماماً مع الهوية الكحلية والزمردية)
const COLOR_THEMES = [
  {
    name: 'الأخضر الزمردي',
    hex: '#10B981',
    glow: 'bg-[#10B981]',
    badge: 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40',
    vsBadge: 'bg-[#0F172A] text-[#10B981] border-[#10B981]/50 shadow-[#10B981]/25',
    border: 'border-[#10B981]/40',
    ring: 'ring-[#10B981]/25',
    button: 'from-[#10B981] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-[#10B981]/30',
    accentText: 'text-[#10B981]',
    dot: 'bg-[#10B981]',
  },
  {
    name: 'الأزرق السماوي',
    hex: '#0EA5E9',
    glow: 'bg-[#0EA5E9]',
    badge: 'bg-[#0EA5E9]/15 text-[#0EA5E9] border-[#0EA5E9]/40',
    vsBadge: 'bg-[#0F172A] text-[#0EA5E9] border-[#0EA5E9]/50 shadow-[#0EA5E9]/25',
    border: 'border-[#0EA5E9]/40',
    ring: 'ring-[#0EA5E9]/25',
    button: 'from-[#0EA5E9] to-sky-600 hover:from-sky-400 hover:to-sky-500 shadow-[#0EA5E9]/30',
    accentText: 'text-[#0EA5E9]',
    dot: 'bg-[#0EA5E9]',
  },
  {
    name: 'الذهبي الدافئ',
    hex: '#F59E0B',
    glow: 'bg-[#F59E0B]',
    badge: 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40',
    vsBadge: 'bg-[#0F172A] text-[#F59E0B] border-[#F59E0B]/50 shadow-[#F59E0B]/25',
    border: 'border-[#F59E0B]/40',
    ring: 'ring-[#F59E0B]/25',
    button: 'from-[#F59E0B] to-amber-600 hover:from-amber-400 hover:to-amber-500 shadow-[#F59E0B]/30',
    accentText: 'text-[#F59E0B]',
    dot: 'bg-[#F59E0B]',
  },
  {
    name: 'البنفسجي الهادئ',
    hex: '#8B5CF6',
    glow: 'bg-[#8B5CF6]',
    badge: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/40',
    vsBadge: 'bg-[#0F172A] text-[#8B5CF6] border-[#8B5CF6]/50 shadow-[#8B5CF6]/25',
    border: 'border-[#8B5CF6]/40',
    ring: 'ring-[#8B5CF6]/25',
    button: 'from-[#8B5CF6] to-purple-600 hover:from-purple-400 hover:to-purple-500 shadow-[#8B5CF6]/30',
    accentText: 'text-[#8B5CF6]',
    dot: 'bg-[#8B5CF6]',
  },
]

export default function LiveTournamentCard({ theme = 'dark' }) {
  const { toast } = useToast()
  const cardRef = useRef(null)

  const [liveData, setLiveData] = useState(null)
  const [tournaments, setTournaments] = useState([])
  const [recentMatches, setRecentMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [upcomingIndex, setUpcomingIndex] = useState(0)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    let active = true
    Promise.allSettled([
      api.get('/v1/live-tournament-matches').then((r) => r.data?.data),
      api.get('/v1/tournaments', { params: { per_page: 3 } }).then((r) => r.data?.data),
      api.get('/v1/matches', { params: { status: 'completed', per_page: 6 } }).then((r) => r.data?.data || r.data),
    ]).then(([matchesRes, toursRes, recentRes]) => {
      if (!active) return
      if (matchesRes.status === 'fulfilled' && matchesRes.value) {
        setLiveData(matchesRes.value)
      }
      if (toursRes.status === 'fulfilled' && toursRes.value) {
        setTournaments(toursRes.value)
      }
      if (recentRes.status === 'fulfilled' && Array.isArray(recentRes.value)) {
        setRecentMatches(recentRes.value)
      }
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [])

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  // Live match if currently running
  const liveMatch = liveData?.live?.[0] || null

  // Upcoming matches list
  const rawUpcoming =
    liveData?.upcoming && liveData.upcoming.length > 0
      ? liveData.upcoming
      : liveData?.next
      ? [liveData.next]
      : []

  // Fallback demo fixtures if database has tournaments but no fixtures yet
  const upcomingList =
    rawUpcoming.length > 0
      ? rawUpcoming
      : tournaments.length > 0
      ? [
          {
            id: 'featured-1',
            tournament: tournaments[0],
            home_team: { name: 'فريق النهضة الرياضي' },
            away_team: { name: 'اتحاد النجوم' },
            stadium: tournaments[0]?.stadium || { name: 'ملعب القرب الرئيسي' },
            match_datetime: new Date(Date.now() + 86400000).toISOString(),
            scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          },
        ]
      : []

  const currentMatch = upcomingList[upcomingIndex] || upcomingList[0] || null
  const totalUpcoming = upcomingList.length

  // Select dynamic theme according to index % 4
  const colorTheme = COLOR_THEMES[upcomingIndex % COLOR_THEMES.length]

  // Share Card Handler (html-to-image + Web Share / Clipboard)
  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    const shareUrl = window.location.href

    try {
      let imageFile = null
      if (cardRef.current) {
        try {
          const blob = await toBlob(cardRef.current, {
            pixelRatio: 2,
            cacheBust: true,
            filter: (node) => !node?.classList?.contains?.('no-share-capture'),
          })
          if (blob) {
            imageFile = new File([blob], `match-card-${upcomingIndex + 1}.png`, { type: 'image/png' })
          }
        } catch (e) {
          console.warn('Image capture note:', e)
        }
      }

      const matchTitle = `${currentMatch?.home_team?.name || 'فريق'} ضد ${currentMatch?.away_team?.name || 'فريق'}`
      const shareText = `⚽ مباراة مرتقبة في بطولة ${currentMatch?.tournament?.name || 'أجي نقصرو'}:\n${matchTitle}\n${shareUrl}`

      if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
        await navigator.share({
          files: [imageFile],
          title: matchTitle,
          text: shareText,
        })
        toast.success('تمت مشاركة بطاقة المباراة بنجاح')
        return
      }

      if (navigator.share) {
        await navigator.share({
          title: matchTitle,
          text: shareText,
          url: shareUrl,
        })
        toast.success('تمت مشاركة رابط المباراة بنجاح')
        return
      }

      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`)
      toast.success('تم نسخ تفاصيل ورابط المباراة إلى الحافظة')
    } catch (err) {
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(shareUrl)
          toast.success('تم نسخ رابط المباراة بنجاح')
        } catch {}
      }
    } finally {
      setSharing(false)
    }
  }

  // Format Date in Pure Arabic
  const formatMatchDate = (dateStr) => {
    if (!dateStr) return 'الموعد يحدد لاحقاً'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
      ]
      return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`
    } catch {
      return dateStr
    }
  }

  const formatMatchTime = (dateStr) => {
    if (!dateStr) return 'مساءً'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return 'مساءً'
      return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return 'مساءً'
    }
  }

  if (!liveMatch && upcomingList.length === 0 && !loading) {
    return null
  }

  return (
    <section aria-labelledby="live-featured-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-4 sm:my-6">
      {/* 1. Live Match Card (عند وجود مباراة جارية مباشرة) */}
      {liveMatch && (
        <div className="mb-5 overflow-hidden rounded-3xl border border-rose-500/50 bg-[#160B12] p-5 sm:p-6 text-white shadow-2xl ring-1 ring-rose-500/30">
          <div className="flex items-center justify-between gap-3 border-b border-rose-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-400 border border-rose-500/40 animate-pulse">
                <span className="size-2 rounded-full bg-rose-500" />
                <span>مباشر الآن ⚽</span>
              </span>
              <span className="text-xs font-bold text-slate-300">
                {liveMatch.tournament?.name || 'البطولة الرسمية'}
              </span>
            </div>
            <Link
              to="/matches"
              className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
            >
              <span>متابعة البث</span>
              <ArrowLeft className="size-3.5 rtl:rotate-0" />
            </Link>
          </div>

          <div className="grid grid-cols-3 items-center gap-2 text-center py-2">
            <div className="flex flex-col items-center gap-1">
              <TeamLogo team={liveMatch.home_team} size="md" />
              <p className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                {liveMatch.home_team?.name || 'المستضيف'}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 text-3xl sm:text-4xl font-black text-rose-400 font-mono">
                <span>{liveMatch.match?.home_score ?? 0}</span>
                <span>:</span>
                <span>{liveMatch.match?.away_score ?? 0}</span>
              </div>
              <span className="mt-1 text-[10px] font-bold text-slate-400">
                {liveMatch.stadium?.name || 'ملعب البطولة'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <TeamLogo team={liveMatch.away_team} size="md" />
              <p className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                {liveMatch.away_team?.name || 'الضيف'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. بطاقة "المباريات القادمة" المتطورة والأنيقة بالتلوين الرباعي الديناميكي */}
      {currentMatch && (
        <article
          ref={cardRef}
          className={`relative overflow-hidden rounded-[28px] border transition-all duration-500 ${
            colorTheme.border
          } bg-[#0c1815] p-5 sm:p-7 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ${
            colorTheme.ring
          }`}
        >
          {/* Dynamic Ambient Glow matching the active match theme */}
          <div
            className={`pointer-events-none absolute -top-24 end-0 size-80 rounded-full blur-[110px] opacity-25 transition-all duration-700 ${colorTheme.glow}`}
            aria-hidden="true"
          />

          <div className="relative z-10">
            {/* Top Header: Badge, Counter 1/17, Tournament Name */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/40 pb-4 mb-5">
              {/* Right Side: Status Badge + Match Counter (‹ 1/17 ›) */}
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider border ${colorTheme.badge}`}>
                  <Flame className="size-3.5" />
                  <span>المباراة القادمة</span>
                </span>

                {totalUpcoming > 1 && (
                  <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-mono font-black text-slate-200 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setUpcomingIndex((p) => (p > 0 ? p - 1 : totalUpcoming - 1))}
                      aria-label="المباراة السابقة"
                      className="size-4 grid place-items-center text-slate-300 hover:text-white transition-transform hover:scale-125 cursor-pointer"
                    >
                      ‹
                    </button>
                    <span>
                      {upcomingIndex + 1}/{totalUpcoming}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUpcomingIndex((p) => (p < totalUpcoming - 1 ? p + 1 : 0))}
                      aria-label="المباراة التالية"
                      className="size-4 grid place-items-center text-slate-300 hover:text-white transition-transform hover:scale-125 cursor-pointer"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>

              {/* Left Side: Tournament Name & Trophy Icon */}
              <div className="flex min-w-0 items-center gap-2 text-end text-xs sm:text-sm font-extrabold text-slate-300">
                <Trophy className="size-4 shrink-0 text-amber-400" />
                <span className="truncate max-w-[180px] sm:max-w-xs">
                  {currentMatch.tournament?.name || tournaments?.[0]?.name || 'بطولة أجي نقصرو لكرة القدم'}
                </span>
              </div>
            </div>

            {/* Teams Matchup Arena: Home Team | VS | Away Team */}
            <div className="relative rounded-2xl border border-white/10 bg-[#0F172A]/90 p-4 sm:p-6 shadow-inner backdrop-blur-xs">
              <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 text-center">
                {/* Home Team */}
                <div className="flex flex-col items-center gap-2.5 min-w-0">
                  <div className="size-16 sm:size-20 rounded-2xl bg-white p-2 shadow-lg ring-2 ring-emerald-500/30 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                    <TeamLogo
                      team={currentMatch.home_team}
                      name={currentMatch.home_team?.name}
                      size="md"
                    />
                  </div>
                  <p className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                    {currentMatch.home_team?.name || 'الفريق المستضيف'}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">الفريق المستضيف</span>
                </div>

                {/* Middle: Prominent "VS" Badge with Dynamic Match Coloring */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative flex flex-col items-center">
                    <span
                      className={`grid size-12 place-items-center rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider border shadow-md transition-all duration-500 ${colorTheme.vsBadge}`}
                    >
                      VS
                    </span>
                    <span className="mt-2 text-[10px] font-bold text-slate-400">
                      مواجهة قوية
                    </span>
                  </div>
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center gap-2.5 min-w-0">
                  <div className="size-16 sm:size-20 rounded-2xl bg-white p-2 shadow-lg ring-2 ring-emerald-500/30 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                    <TeamLogo
                      team={currentMatch.away_team}
                      name={currentMatch.away_team?.name}
                      size="md"
                    />
                  </div>
                  <p className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                    {currentMatch.away_team?.name || 'الفريق الضيف'}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400">الفريق الضيف</span>
                </div>
              </div>
            </div>

            {/* Glowing Share Button (زر المشاركة مع التقاط صورة البطاقة) */}
            <div className="mt-4 flex justify-center no-share-capture">
              <button
                type="button"
                onClick={handleShare}
                disabled={sharing}
                className={`inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r ${colorTheme.button} px-7 py-2.5 text-xs font-black uppercase tracking-wider text-white ring-1 ring-white/20 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-75 cursor-pointer shadow-lg`}
              >
                <Share2 className="size-3.5" />
                <span>{sharing ? 'جاري تجهيز البطاقة...' : 'مشاركة بطاقة المباراة ⚡'}</span>
              </button>
            </div>

            {/* Match Details Box (الموعد، التوقيت، والملعب) */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3.5 backdrop-blur-sm">
              <p className="mb-2 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                تفاصيل ومكان إقامة المباراة
              </p>
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-bold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-slate-400" />
                  <span>{formatMatchDate(currentMatch.scheduled_at || currentMatch.match_datetime)}</span>
                </span>

                <span className="flex items-center gap-1.5 tabular-nums">
                  <Clock className="size-3.5 text-slate-400" />
                  <span>{formatMatchTime(currentMatch.scheduled_at || currentMatch.match_datetime)}</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">
                    {currentMatch.stadium?.name || tournaments?.[0]?.stadium?.name || 'ملعب البطولة الرئيسي'}
                  </span>
                </span>
              </div>
            </div>

            {/* View Tournament Link */}
            <div className="mt-3.5 flex justify-center no-share-capture">
              <Link
                to={`/tournaments/${currentMatch.tournament?.slug || currentMatch.tournament?.id || ''}`}
                className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 hover:text-emerald-300 transition-colors group"
              >
                <span>عرض تفاصيل البطولة والجدول الكامل</span>
                <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-1 rtl:rotate-0" />
              </Link>
            </div>

            {/* Pagination Dots (شريط النقاط السفلي للتنقل الملون) */}
            {totalUpcoming > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 px-1 no-share-capture">
                <div className="flex items-center gap-1.5">
                  {upcomingList.map((m, i) => {
                    const isActive = i === upcomingIndex
                    const dotTheme = COLOR_THEMES[i % COLOR_THEMES.length]
                    return (
                      <button
                        key={m.id || i}
                        type="button"
                        onClick={() => setUpcomingIndex(i)}
                        aria-label={`المباراة رقم ${i + 1}`}
                        className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                          isActive
                            ? `w-7 ${dotTheme.dot} shadow-md`
                            : 'w-2.5 bg-slate-600 hover:bg-slate-400'
                        }`}
                        title={`الانتقال إلى المباراة ${i + 1}`}
                      />
                    )
                  })}
                </div>

                <Link
                  to="/matches"
                  className="inline-flex items-center gap-1 text-[11px] font-black text-slate-400 hover:text-white transition-colors"
                >
                  <span>عرض كافة المباريات القادمة ({totalUpcoming})</span>
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            )}
          </div>
        </article>
      )}

      {/* 3. شريط آخر النتائج المكتملة (Results Ticker) */}
      {recentMatches.length > 0 && (
        <div
          className={`mt-3.5 flex items-center gap-2.5 overflow-hidden rounded-2xl border px-3 py-2 transition-colors ${
            isDark
              ? 'bg-[#14221C] border-emerald-900/40 text-slate-300 shadow-sm'
              : 'bg-white border-slate-200/80 text-slate-700 shadow-2xs'
          }`}
        >
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-black text-emerald-400">
            <Zap className="size-3.5 fill-emerald-400" />
            <span>آخر النتائج</span>
          </div>

          <div className="flex flex-1 items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar whitespace-nowrap text-xs font-bold">
            {recentMatches.map((item, idx) => {
              const h = item.home_team?.name || 'فريق'
              const a = item.away_team?.name || 'فريق'
              const s = item.match
                ? `${item.match.home_score} - ${item.match.away_score}`
                : item.score || '0 - 0'

              return (
                <div key={item.id || idx} className="inline-flex items-center gap-2 shrink-0">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{h}</span>
                  <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[11px] font-black text-emerald-400 tabular-nums">
                    {s}
                  </span>
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{a}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
