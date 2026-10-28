import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  Clock,
  Flame,
  Loader2,
  MapPin,
  Radio,
  Share2,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react'
import { toBlob } from 'html-to-image'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import TeamLogo from '../../components/profile/TeamLogo'
import { useToast } from '../../components/ui/Toast'

// Dynamic Match-Status & Theme Color Palettes (متناسقة تماماً مع الهوية الكحلية والزمردية)
const COLOR_THEMES = [
  {
    name: 'الأخضر الزمردي',
    hex: '#10B981',
    glow: 'rgba(16, 185, 129, 0.45)',
    radialGlow1: 'rgba(16, 185, 129, 0.45)',
    radialGlow2: 'rgba(14, 165, 233, 0.35)',
    badge: 'border-emerald-400/50 bg-emerald-950/60 text-emerald-300 shadow-emerald-950/40',
    vsGlow: 'text-[#10B981] drop-shadow-[0_0_14px_rgba(16,185,129,0.8)]',
    contextBadge: 'bg-slate-950/70 border-emerald-500/40 text-emerald-300',
    border: 'border-emerald-500/40',
    outerGlow: 'shadow-[0_0_50px_rgba(16,185,129,0.25)]',
    ring: 'ring-emerald-500/30',
    button: 'from-[#10B981] via-emerald-500 to-[#059669] hover:from-emerald-400 hover:to-emerald-500 shadow-[0_10px_25px_rgba(16,185,129,0.4)] border-emerald-300/40',
    remindBtn: 'border-emerald-500/50 hover:border-emerald-400 text-emerald-300',
    iconColor: 'text-emerald-400',
    dot: 'bg-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.8)]',
  },
  {
    name: 'الأزرق السماوي',
    hex: '#0EA5E9',
    glow: 'rgba(14, 165, 233, 0.45)',
    radialGlow1: 'rgba(14, 165, 233, 0.45)',
    radialGlow2: 'rgba(99, 102, 241, 0.35)',
    badge: 'border-sky-400/50 bg-sky-950/60 text-sky-300 shadow-sky-950/40',
    vsGlow: 'text-[#0EA5E9] drop-shadow-[0_0_14px_rgba(14,165,233,0.8)]',
    contextBadge: 'bg-slate-950/70 border-sky-500/40 text-sky-300',
    border: 'border-sky-500/40',
    outerGlow: 'shadow-[0_0_50px_rgba(14,165,233,0.25)]',
    ring: 'ring-sky-500/30',
    button: 'from-[#0EA5E9] via-sky-500 to-[#0284C7] hover:from-sky-400 hover:to-sky-500 shadow-[0_10px_25px_rgba(14,165,233,0.4)] border-sky-300/40',
    remindBtn: 'border-sky-500/50 hover:border-sky-400 text-sky-300',
    iconColor: 'text-sky-400',
    dot: 'bg-[#0EA5E9] shadow-[0_0_12px_rgba(14,165,233,0.8)]',
  },
  {
    name: 'الذهبي الدافئ',
    hex: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.45)',
    radialGlow1: 'rgba(245, 158, 11, 0.45)',
    radialGlow2: 'rgba(234, 88, 12, 0.35)',
    badge: 'border-amber-400/50 bg-amber-950/60 text-amber-300 shadow-amber-950/40',
    vsGlow: 'text-[#F59E0B] drop-shadow-[0_0_14px_rgba(245,158,11,0.8)]',
    contextBadge: 'bg-slate-950/70 border-amber-500/40 text-amber-300',
    border: 'border-amber-500/40',
    outerGlow: 'shadow-[0_0_50px_rgba(245,158,11,0.25)]',
    ring: 'ring-amber-500/30',
    button: 'from-[#F59E0B] via-amber-500 to-[#D97706] hover:from-amber-400 hover:to-amber-500 shadow-[0_10px_25px_rgba(245,158,11,0.4)] border-amber-300/40',
    remindBtn: 'border-amber-500/50 hover:border-amber-400 text-amber-300',
    iconColor: 'text-amber-400',
    dot: 'bg-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.8)]',
  },
  {
    name: 'البنفسجي الهادئ',
    hex: '#8B5CF6',
    glow: 'rgba(139, 92, 246, 0.45)',
    radialGlow1: 'rgba(139, 92, 246, 0.45)',
    radialGlow2: 'rgba(236, 72, 153, 0.35)',
    badge: 'border-purple-400/50 bg-purple-950/60 text-purple-300 shadow-purple-950/40',
    vsGlow: 'text-[#8B5CF6] drop-shadow-[0_0_14px_rgba(139,92,246,0.8)]',
    contextBadge: 'bg-slate-950/70 border-purple-500/40 text-purple-300',
    border: 'border-purple-500/40',
    outerGlow: 'shadow-[0_0_50px_rgba(139,92,246,0.25)]',
    ring: 'ring-purple-500/30',
    button: 'from-[#8B5CF6] via-purple-500 to-[#7C3AED] hover:from-purple-400 hover:to-purple-500 shadow-[0_10px_25px_rgba(139,92,246,0.4)] border-purple-300/40',
    remindBtn: 'border-purple-500/50 hover:border-purple-400 text-purple-300',
    iconColor: 'text-purple-400',
    dot: 'bg-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.8)]',
  },
  {
    name: 'القرمزي الحماسي',
    hex: '#EF4444',
    glow: 'rgba(239, 68, 68, 0.45)',
    radialGlow1: 'rgba(239, 68, 68, 0.45)',
    radialGlow2: 'rgba(249, 115, 22, 0.35)',
    badge: 'border-rose-400/50 bg-rose-950/60 text-rose-300 shadow-rose-950/40',
    vsGlow: 'text-[#EF4444] drop-shadow-[0_0_14px_rgba(239,68,68,0.8)]',
    contextBadge: 'bg-slate-950/70 border-rose-500/40 text-rose-300',
    border: 'border-rose-500/40',
    outerGlow: 'shadow-[0_0_50px_rgba(239,68,68,0.25)]',
    ring: 'ring-rose-500/30',
    button: 'from-[#EF4444] via-rose-500 to-[#DC2626] hover:from-rose-400 hover:to-rose-500 shadow-[0_10px_25px_rgba(239,68,68,0.4)] border-rose-300/40',
    remindBtn: 'border-rose-500/50 hover:border-rose-400 text-rose-300',
    iconColor: 'text-rose-400',
    dot: 'bg-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.8)]',
  },
]

// Ticker Item for genuine match results
function TickerItem({ item, isDark }) {
  const hName = item.home_team?.name || item.homeTeam?.name || item.host_team?.name || 'فريق أ'
  const aName = item.away_team?.name || item.awayTeam?.name || 'فريق ب'
  const hLogo = item.home_team?.logo_url || item.homeTeam?.logo_url || item.host_team?.logo_url
  const aLogo = item.away_team?.logo_url || item.awayTeam?.logo_url

  const scoreText = item.match
    ? `${item.match.home_score ?? 0} - ${item.match.away_score ?? 0}`
    : item.home_score !== undefined && item.away_score !== undefined
    ? `${item.home_score} - ${item.away_score}`
    : item.score || '0 - 0'

  const [hErr, setHErr] = useState(false)
  const [aErr, setAErr] = useState(false)

  return (
    <div className="inline-flex items-center gap-2.5 shrink-0 px-3 py-1 rounded-xl bg-slate-900/30 hover:bg-emerald-500/10 transition-colors border border-slate-700/30 hover:border-emerald-500/40">
      {/* الفريق الأول مع شعاره المصغر */}
      <div className="flex items-center gap-1.5 min-w-0">
        {hLogo && !hErr ? (
          <img
            src={hLogo}
            alt={hName}
            onError={() => setHErr(true)}
            className="size-5 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0 bg-slate-800"
          />
        ) : (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#1F7A4D] text-[9px] font-black text-white">
            {hName.slice(0, 2)}
          </span>
        )}
        <span className={`text-xs font-extrabold truncate max-w-[100px] ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          {hName}
        </span>
      </div>

      {/* شارة النتيجة */}
      <span className="rounded-md bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-xs font-black text-emerald-400 tabular-nums shadow-xs">
        {scoreText}
      </span>

      {/* الفريق الثاني مع شعاره المصغر */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-xs font-extrabold truncate max-w-[100px] ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
          {aName}
        </span>
        {aLogo && !aErr ? (
          <img
            src={aLogo}
            alt={aName}
            onError={() => setAErr(true)}
            className="size-5 rounded-full object-cover ring-1 ring-emerald-500/40 shrink-0 bg-slate-800"
          />
        ) : (
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#1F7A4D] text-[9px] font-black text-white">
            {aName.slice(0, 2)}
          </span>
        )}
      </div>

      {/* فاصل جمالي بين المباريات */}
      <span className="size-1 rounded-full bg-emerald-500/40 mx-1 shrink-0" />
    </div>
  )
}

export default function LiveTournamentCard({ theme = 'dark' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const cardRef = useRef(null)

  const [liveData, setLiveData] = useState(null)
  const [tournaments, setTournaments] = useState([])
  const [recentMatches, setRecentMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [upcomingIndex, setUpcomingIndex] = useState(0)
  const [sharing, setSharing] = useState(false)
  const [activeReminders, setActiveReminders] = useState(new Set())
  const [remindLoadingId, setRemindLoadingId] = useState(null)

  // Touch Swipe State for Mobile Horizontal Swiping
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  // Fetch active reminders for authenticated user
  useEffect(() => {
    if (!user) {
      setActiveReminders(new Set())
      return
    }

    let isSubscribed = true
    api.get('/v1/matches/reminders/active')
      .then((res) => {
        if (!isSubscribed) return
        const ids = res.data?.active_fixture_ids || []
        setActiveReminders(new Set(ids))
      })
      .catch(() => {
        // Non-blocking for guests or transient errors
      })

    return () => {
      isSubscribed = false
    }
  }, [user])

  // Toggle or cancel 12-hour reminder
  const handleToggleReminder = async (fixtureId) => {
    if (!fixtureId) return

    if (!user) {
      toast.info('يرجى تسجيل الدخول أولاً لتفعيل التذكير بموعد المباراة')
      navigate('/auth')
      return
    }

    const isAlreadyReminded = activeReminders.has(fixtureId)
    setRemindLoadingId(fixtureId)

    if (isAlreadyReminded) {
      try {
        const res = await api.post('/v1/matches/reminders/cancel', { fixture_id: fixtureId })
        setActiveReminders((prev) => {
          const next = new Set(prev)
          next.delete(fixtureId)
          return next
        })
        toast.success(res.data?.message || 'تم إلغاء التذكير بنجاح')
      } catch (err) {
        toast.error(err.response?.data?.message || 'تعذر إلغاء التذكير، يرجى المحاولة لاحقاً')
      } finally {
        setRemindLoadingId(null)
      }
    } else {
      try {
        const res = await api.post('/v1/matches/reminders', { fixture_id: fixtureId })
        setActiveReminders((prev) => {
          const next = new Set(prev)
          next.add(fixtureId)
          return next
        })
        toast.success(res.data?.message || 'تم تفعيل التذكير بنجاح! سنقوم بإشعارك قبل 12 ساعة من انطلاق المباراة.')
      } catch (err) {
        const msg = err.response?.data?.message || 'تعذر تفعيل التذكير، يرجى المحاولة لاحقاً'
        toast.error(msg)
      } finally {
        setRemindLoadingId(null)
      }
    }
  }

  useEffect(() => {
    let isSubscribed = true
    Promise.allSettled([
      api.get('/v1/live-tournament-matches').then((r) => r.data?.data),
      api.get('/v1/tournaments', { params: { per_page: 3 } }).then((r) => r.data?.data),
      api.get('/v1/matches', { params: { status: 'completed', per_page: 6 } }).then((r) => r.data?.data || r.data),
    ]).then(([matchesRes, toursRes, recentRes]) => {
      if (!isSubscribed) return
      if (matchesRes.status === 'fulfilled' && matchesRes.value) {
        setLiveData(matchesRes.value)
        if (matchesRes.value.finished && matchesRes.value.finished.length > 0) {
          setRecentMatches(matchesRes.value.finished)
        }
      }
      if (toursRes.status === 'fulfilled' && toursRes.value) {
        setTournaments(toursRes.value)
      }
      if (recentRes.status === 'fulfilled' && Array.isArray(recentRes.value)) {
        setRecentMatches(recentRes.value)
      }
      setLoading(false)
    }).catch(() => {
      if (isSubscribed) setLoading(false)
    })

    return () => {
      isSubscribed = false
    }
  }, [])

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  // Live match if currently running
  const liveMatch = liveData?.live?.[0] || null

  // Display confirmed results only, exclude 0-0, deduplicate
  const displayRecent = useMemo(() => {
    const list = recentMatches && Array.isArray(recentMatches) ? recentMatches : []
    const seen = new Set()
    return list.filter((item) => {
      if (!item) return false
      // Only confirmed/finished/completed results
      const status = item.status || item.match?.status
      if (status && !['completed', 'finished'].includes(status)) return false

      // Score check: omit 0 - 0 scores
      const hScore = item.match ? item.match.home_score : item.home_score
      const aScore = item.match ? item.match.away_score : item.away_score
      if (hScore === undefined || aScore === undefined) return false
      if (Number(hScore) === 0 && Number(aScore) === 0) return false

      // Deduplicate
      const key = item.id ? String(item.id) : `${item.home_team_id || item.host_team_id}-${item.away_team_id}-${item.match_datetime || item.date}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [recentMatches])

  // Upcoming matches strictly from real database API data, scheduled within next 7 days
  const rawUpcoming = useMemo(() => {
    const now = Date.now() - 6 * 60 * 60 * 1000
    const maxWindow = Date.now() + 8 * 24 * 60 * 60 * 1000
    const list =
      liveData?.upcoming && liveData.upcoming.length > 0
        ? liveData.upcoming
        : liveData?.next
        ? [liveData.next]
        : []
    return list
      .filter((m) => {
        if (!m) return false
        const dt = m.scheduled_at || m.match_datetime || m.date
        if (dt) {
          const normalized = typeof dt === 'string' ? dt.replace(' ', 'T') : dt
          const time = new Date(normalized).getTime()
          if (!isNaN(time) && (time < now || time > maxWindow)) return false
        }
        return true
      })
      .sort((a, b) => {
        const da = new Date(typeof (a.scheduled_at || a.match_datetime || a.date) === 'string' ? (a.scheduled_at || a.match_datetime || a.date).replace(' ', 'T') : (a.scheduled_at || a.match_datetime || a.date)).getTime() || 0
        const db = new Date(typeof (b.scheduled_at || b.match_datetime || b.date) === 'string' ? (b.scheduled_at || b.match_datetime || b.date).replace(' ', 'T') : (b.scheduled_at || b.match_datetime || b.date)).getTime() || 0
        return da - db
      })
  }, [liveData])

  // Check if active tournaments include scheduled matches within next 7 days
  const realTournamentUpcoming = useMemo(() => {
    const now = Date.now() - 6 * 60 * 60 * 1000
    const maxWindow = Date.now() + 8 * 24 * 60 * 60 * 1000
    const res = []
    if (tournaments && Array.isArray(tournaments)) {
      for (const t of tournaments) {
        if (Array.isArray(t.fixtures)) {
          for (const f of t.fixtures) {
            if (f.status === 'scheduled' || f.status === 'pending') {
              const dt = f.scheduled_at || f.match_datetime || f.date
              if (dt) {
                const normalized = typeof dt === 'string' ? dt.replace(' ', 'T') : dt
                const time = new Date(normalized).getTime()
                if (!isNaN(time) && (time < now || time > maxWindow)) continue
              }
              res.push({
                ...f,
                tournament: t,
              })
            }
          }
        }
      }
    }
    return res.sort((a, b) => {
      const da = new Date(typeof (a.scheduled_at || a.match_datetime || a.date) === 'string' ? (a.scheduled_at || a.match_datetime || a.date).replace(' ', 'T') : (a.scheduled_at || a.match_datetime || a.date)).getTime() || 0
      const db = new Date(typeof (b.scheduled_at || b.match_datetime || b.date) === 'string' ? (b.scheduled_at || b.match_datetime || b.date).replace(' ', 'T') : (b.scheduled_at || b.match_datetime || b.date)).getTime() || 0
      return da - db
    })
  }, [tournaments])

  const upcomingList = rawUpcoming.length > 0 ? rawUpcoming : realTournamentUpcoming

  const currentMatch = upcomingList[upcomingIndex] || upcomingList[0] || null
  const totalUpcoming = upcomingList.length

  // Select dynamic theme according to index % COLOR_THEMES.length
  const colorTheme = COLOR_THEMES[upcomingIndex % COLOR_THEMES.length]
  const prevTheme = COLOR_THEMES[(upcomingIndex - 1 + COLOR_THEMES.length) % COLOR_THEMES.length]
  const nextTheme = COLOR_THEMES[(upcomingIndex + 1) % COLOR_THEMES.length]

  // Touch Swipe Handlers for Smooth Mobile Navigation
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

    // Threshold of 45px for swipe detection
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        // Swiped left
        if (isRtl) {
          setUpcomingIndex((p) => (p < totalUpcoming - 1 ? p + 1 : 0))
        } else {
          setUpcomingIndex((p) => (p > 0 ? p - 1 : totalUpcoming - 1))
        }
      } else {
        // Swiped right
        if (isRtl) {
          setUpcomingIndex((p) => (p > 0 ? p - 1 : totalUpcoming - 1))
        } else {
          setUpcomingIndex((p) => (p < totalUpcoming - 1 ? p + 1 : 0))
        }
      }
    }

    touchStartX.current = 0
    touchEndX.current = 0
  }

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
      const normalized = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr
      const d = new Date(normalized)
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
    if (!dateStr) return '19:00'
    try {
      const normalized = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr
      const d = new Date(normalized)
      if (isNaN(d.getTime())) return '19:00'
      return d.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit', hour12: false })
    } catch {
      return '19:00'
    }
  }

  const getRoundLabel = (m) => {
    if (!m) return 'الجولة 5'
    if (typeof m.round === 'object' && m.round !== null) {
      return m.round.name || (m.round.id ? `الجولة ${m.round.id}` : 'الجولة 5')
    }
    if (typeof m.round === 'string' && m.round) return m.round
    if (m.matchday) return `الجولة ${m.matchday}`
    if (typeof m.group === 'object' && m.group?.name) return `المجموعة ${m.group.name}`
    return 'الجولة 5'
  }

  const getTournamentName = (m) => {
    if (!m) return tournaments?.[0]?.name || 'دوري أبطال الأحياء 2026'
    if (typeof m.tournament === 'object' && m.tournament?.name) return m.tournament.name
    if (typeof m.tournament === 'string' && m.tournament) return m.tournament
    return tournaments?.[0]?.name || 'دوري أبطال الأحياء 2026'
  }

  const getTeamName = (team, fallback = 'فريق رياضي') => {
    if (!team) return fallback
    if (typeof team === 'object' && team.name) return team.name
    if (typeof team === 'string' && team) return team
    return fallback
  }

  const getStadiumName = (m) => {
    if (!m) return tournaments?.[0]?.stadium?.name || 'ملعب القرب الرئيسي'
    if (typeof m.stadium === 'object' && m.stadium?.name) return m.stadium.name
    if (typeof m.stadium === 'string' && m.stadium) return m.stadium
    return tournaments?.[0]?.stadium?.name || 'ملعب القرب الرئيسي'
  }

  if (!liveMatch && upcomingList.length === 0 && !loading) {
    return (
      <section aria-labelledby="live-featured-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-4 sm:my-6">
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[34px] border border-emerald-500/30 bg-[#0A161E] p-6 sm:p-8 text-center text-white shadow-xl">
          <div className="mx-auto size-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 grid place-items-center mb-3">
            <CalendarDays className="size-6 text-emerald-400" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-black text-emerald-300 mb-2">
            جدول المباريات
          </span>
          <h2 id="live-featured-heading" className="text-base sm:text-lg font-black text-white">
            لا توجد مباريات جارية أو قادمة مجدولة حالياً
          </h2>
          <p className="mt-1 text-xs text-slate-300 max-w-md mx-auto">
            سيتم إدراج مواعيد المباريات الرسمية تلقائياً فور اعتمادها من قبل لجان تنظيم البطولات ومسيري الفرق.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/tournaments"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-600 transition-colors"
            >
              <span>تصفح البطولات المتاحة</span>
              <ArrowLeft className="size-3.5 rtl:rotate-0" />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="live-featured-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-4 sm:my-6">
      {/* 1. Live Match Card (عند وجود مباراة جارية مباشرة) */}
      {liveMatch && (
        <div className="mb-6 overflow-hidden rounded-3xl border border-rose-500/50 bg-[#160B12] p-5 sm:p-6 text-white shadow-2xl ring-1 ring-rose-500/30">
          <div className="flex items-center justify-between gap-3 border-b border-rose-500/20 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-black text-rose-400 border border-rose-500/40 animate-pulse">
                <span className="size-2 rounded-full bg-rose-500" />
                <span>مباشر الآن ⚽</span>
              </span>
              <span className="text-xs font-bold text-slate-300">
                {getTournamentName(liveMatch)}
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
                {getTeamName(liveMatch.home_team, 'المستضيف')}
              </p>
            </div>
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center gap-2 text-3xl sm:text-4xl font-black text-rose-400 font-mono">
                <span>{liveMatch.match?.home_score ?? 0}</span>
                <span>:</span>
                <span>{liveMatch.match?.away_score ?? 0}</span>
              </div>
              <span className="mt-1 text-[10px] font-bold text-slate-400">
                {getStadiumName(liveMatch)}
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <TeamLogo team={liveMatch.away_team} size="md" />
              <p className="text-xs sm:text-sm font-black text-white truncate max-w-full">
                {getTeamName(liveMatch.away_team, 'الضيف')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. بطاقة "المباريات القادمة" السنيمائية والمطابقة للمرجع مع البيئة الثلاثية الأبعاد */}
      {currentMatch && (
        <div
          className="relative w-full overflow-hidden py-3 sm:py-5 flex flex-col items-center select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Carousel Viewport with Side Card Peek Effect */}
          <div className="relative w-full flex items-center justify-center">
            {/* Previous Card Peek (Right side in RTL) */}
            {totalUpcoming > 1 && (
              <div
                onClick={() => setUpcomingIndex((p) => (p > 0 ? p - 1 : totalUpcoming - 1))}
                className={`hidden md:block absolute -start-14 lg:-start-10 w-[22%] lg:w-[20%] h-[82%] rounded-[32px] border ${prevTheme.border} opacity-40 blur-[0.5px] hover:opacity-65 transition-all duration-500 cursor-pointer overflow-hidden z-0 shadow-2xl pointer-events-auto`}
                aria-hidden="true"
                title="المباراة السابقة"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: 'url(/stadium-cinematic.png)' }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center, ${prevTheme.glow} 0%, rgba(15, 23, 42, 0.9) 80%)`,
                  }}
                />
              </div>
            )}

            {/* Central Main Cinematic Card */}
            <article
              ref={cardRef}
              className={`relative z-10 w-full max-w-3xl overflow-hidden rounded-[28px] sm:rounded-[36px] border ${colorTheme.border} ${colorTheme.outerGlow} p-4 sm:p-7 text-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85)] transition-all duration-500`}
            >
              {/* Layer 1: Stadium Background Asset */}
              <div
                className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-700 pointer-events-none"
                style={{
                  backgroundImage: 'url(/stadium-cinematic.png)',
                  backgroundPosition: 'center 38%',
                }}
                aria-hidden="true"
              />

              {/* Layer 2: Green-to-Blue Cinematic Radial Lighting */}
              <div
                className="absolute inset-0 pointer-events-none transition-all duration-700"
                style={{
                  background: `radial-gradient(circle at 18% 30%, ${colorTheme.radialGlow1} 0%, transparent 60%), radial-gradient(circle at 82% 30%, ${colorTheme.radialGlow2} 0%, transparent 60%)`,
                }}
                aria-hidden="true"
              />

              {/* Layer 3: Dark Vignette & Readability Gradient */}
              <div
                className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-950/45 via-slate-950/70 to-slate-950/95"
                aria-hidden="true"
              />

              {/* Functional Content Layers */}
              <div className="relative z-10">
                {/* 1. Upper Zone: Badge (Right in RTL), Tournament in Center, Carousel Counter (Left in RTL) */}
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3.5 mb-5 sm:mb-6">
                  {/* Status Badge: 🔥 المباراة القادمة */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider border backdrop-blur-md transition-all duration-500 shadow-md ${colorTheme.badge}`}
                  >
                    <Flame className="size-3.5 text-amber-400 fill-amber-400/20" />
                    <span>المباراة القادمة</span>
                  </span>

                  {/* Tournament Title & Round (Center Top) */}
                  <div className="flex flex-col items-center justify-center text-center px-2">
                    <Trophy className="size-5 text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)] mb-1" />
                    <span className="text-xs sm:text-sm font-black text-white truncate max-w-[150px] sm:max-w-xs drop-shadow-sm">
                      {getTournamentName(currentMatch)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-300/90 mt-0.5">
                      {getRoundLabel(currentMatch)}
                    </span>
                  </div>

                  {/* Carousel Counter Pill: ‹ 1/17 › */}
                  <div className="flex items-center gap-1.5 rounded-full bg-slate-950/65 backdrop-blur-md px-2.5 sm:px-3 py-1 text-xs font-mono font-bold text-white border border-white/10 shadow-md">
                    <button
                      type="button"
                      onClick={() => setUpcomingIndex((p) => (p > 0 ? p - 1 : totalUpcoming - 1))}
                      aria-label="المباراة السابقة"
                      className="size-5 grid place-items-center text-slate-300 hover:text-white transition-transform hover:scale-125 cursor-pointer"
                    >
                      ‹
                    </button>
                    <span className="tabular-nums">
                      {upcomingIndex + 1}/{Math.max(totalUpcoming, 1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUpcomingIndex((p) => (p < totalUpcoming - 1 ? p + 1 : 0))}
                      aria-label="المباراة التالية"
                      className="size-5 grid place-items-center text-slate-300 hover:text-white transition-transform hover:scale-125 cursor-pointer"
                    >
                      ›
                    </button>
                  </div>
                </div>

                {/* 2. Central Zone: Team Crests (Jerseys Removed) & VS Treatment */}
                <div className="my-3 sm:my-5">
                  <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 text-center">
                    {/* Home Team (المستضيف) */}
                    <div className="flex flex-col items-center gap-2 min-w-0">
                      <div className="size-20 sm:size-24 rounded-[22px] sm:rounded-[26px] bg-white p-2.5 sm:p-3 shadow-[0_12px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/20 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                        <TeamLogo
                          team={currentMatch.home_team}
                          name={currentMatch.home_team?.name}
                          className="size-full"
                          bg="bg-transparent"
                          rounded="rounded-none"
                        />
                      </div>
                      <p className="text-xs sm:text-base font-black text-white truncate max-w-full drop-shadow-md">
                        {getTeamName(currentMatch.home_team, 'فريق المستضيف')}
                      </p>
                      <span className="rounded-full bg-slate-950/60 backdrop-blur-xs border border-white/10 px-2.5 sm:px-3 py-0.5 text-[10px] sm:text-[11px] font-bold text-slate-300 shadow-xs">
                        الفريق المستضيف
                      </span>
                    </div>

                    {/* Middle: Prominent Glowing "VS" + Context Pill */}
                    <div className="flex flex-col items-center justify-center">
                      <span className={`text-2xl sm:text-4xl font-black font-sans tracking-widest transition-all duration-500 ${colorTheme.vsGlow}`}>
                        VS
                      </span>
                      <span className={`mt-2 rounded-full px-3.5 py-0.5 text-[10px] sm:text-[11px] font-black backdrop-blur-md border shadow-md transition-all duration-500 ${colorTheme.contextBadge}`}>
                        مواجهة قوية
                      </span>
                    </div>

                    {/* Away Team (الضيف) */}
                    <div className="flex flex-col items-center gap-2 min-w-0">
                      <div className="size-20 sm:size-24 rounded-[22px] sm:rounded-[26px] bg-white p-2.5 sm:p-3 shadow-[0_12px_28px_rgba(0,0,0,0.45)] ring-1 ring-white/20 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                        <TeamLogo
                          team={currentMatch.away_team}
                          name={currentMatch.away_team?.name}
                          className="size-full"
                          bg="bg-transparent"
                          rounded="rounded-none"
                        />
                      </div>
                      <p className="text-xs sm:text-base font-black text-white truncate max-w-full drop-shadow-md">
                        {getTeamName(currentMatch.away_team, 'فريق الضيف')}
                      </p>
                      <span className="rounded-full bg-slate-950/60 backdrop-blur-xs border border-white/10 px-2.5 sm:px-3 py-0.5 text-[10px] sm:text-[11px] font-bold text-slate-300 shadow-xs">
                        الفريق الضيف
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Lower Zone: Glassmorphism Match Details Panel (التاريخ، الساعة، الملعب) */}
                <div className="mt-3.5 sm:mt-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-950/70 p-2.5 sm:p-4 shadow-xl backdrop-blur-md">
                  <div className="grid grid-cols-3 divide-x divide-slate-700/40 rtl:divide-x-reverse text-center">
                    {/* التاريخ (Date) */}
                    <div className="flex flex-col items-center justify-center px-1 sm:px-3">
                      <div className="flex items-center gap-1 text-slate-400 mb-0.5 sm:mb-1">
                        <CalendarDays className="size-3 sm:size-4 text-emerald-400 shrink-0" />
                        <span className="text-[9px] sm:text-[10px] font-bold">التاريخ</span>
                      </div>
                      <span className="text-[11px] sm:text-sm font-black text-white truncate max-w-full">
                        {formatMatchDate(currentMatch.scheduled_at || currentMatch.match_datetime)}
                      </span>
                    </div>

                    {/* الساعة (Time) */}
                    <div className="flex flex-col items-center justify-center px-1 sm:px-3">
                      <div className="flex items-center gap-1 text-slate-400 mb-0.5 sm:mb-1">
                        <Clock className="size-3 sm:size-4 text-emerald-400 shrink-0" />
                        <span className="text-[9px] sm:text-[10px] font-bold">الساعة</span>
                      </div>
                      <span className="text-xs sm:text-sm font-black text-white tabular-nums font-mono">
                        {formatMatchTime(currentMatch.scheduled_at || currentMatch.match_datetime)}
                      </span>
                    </div>

                    {/* الملعب (Venue) */}
                    <div className="flex flex-col items-center justify-center px-1 sm:px-3">
                      <div className="flex items-center gap-1 text-slate-400 mb-0.5 sm:mb-1">
                        <MapPin className="size-3 sm:size-4 text-emerald-400 shrink-0" />
                        <span className="text-[9px] sm:text-[10px] font-bold">الملعب</span>
                      </div>
                      <span className="text-[11px] sm:text-sm font-black text-white truncate max-w-full">
                        {getStadiumName(currentMatch)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Bottom Action Bar: Share Match Card & Remind Me Buttons */}
                <div className="mt-3.5 sm:mt-5 flex items-center gap-2 sm:gap-3 no-share-capture">
                  {/* Secondary Approved Style Share Button */}
                  <button
                    type="button"
                    onClick={handleShare}
                    disabled={sharing}
                    className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-full border-2 border-[#1F7A4D] bg-[#14221C]/80 hover:bg-[#1F7A4D]/25 py-2.5 sm:py-3.5 px-3 sm:px-6 text-xs sm:text-sm font-black text-white shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-98 disabled:opacity-75 cursor-pointer"
                  >
                    <span className="truncate">{sharing ? 'جاري التجهيز...' : 'مشاركة بطاقة المباراة'}</span>
                    <Share2 className="size-3.5 sm:size-4 shrink-0 text-[#1F7A4D]" />
                  </button>

                  {/* Real 12-Hour Kickoff Remind Me Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleReminder(currentMatch.id)}
                    disabled={remindLoadingId === currentMatch.id}
                    className={`shrink-0 flex items-center justify-center gap-1.5 sm:gap-2 rounded-full border py-2.5 sm:py-3.5 px-3.5 sm:px-5 text-xs sm:text-sm font-bold backdrop-blur-md shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer disabled:opacity-75 ${
                      activeReminders.has(currentMatch.id)
                        ? 'border-emerald-500/80 bg-emerald-950/80 text-emerald-300 hover:bg-rose-950/70 hover:border-rose-500/80 hover:text-rose-300 group'
                        : `bg-slate-950/75 hover:bg-slate-900/90 ${colorTheme.remindBtn}`
                    }`}
                    title={
                      activeReminders.has(currentMatch.id)
                        ? 'انقر لإلغاء التذكير بالمباراة'
                        : 'تفعيل تذكير قبل 12 ساعة من انطلاق المباراة'
                    }
                  >
                    {remindLoadingId === currentMatch.id ? (
                      <>
                        <Loader2 className="size-3.5 sm:size-4 animate-spin text-emerald-400 shrink-0" />
                        <span>جاري التفعيل...</span>
                      </>
                    ) : activeReminders.has(currentMatch.id) ? (
                      <>
                        <Check className="size-3.5 sm:size-4 text-emerald-400 shrink-0 group-hover:hidden" />
                        <span className="group-hover:hidden">تم تفعيل التذكير</span>
                        <span className="hidden group-hover:inline text-rose-300">ألغِ التذكير</span>
                      </>
                    ) : (
                      <>
                        <Bell className="size-3.5 sm:size-4 text-emerald-400 shrink-0" />
                        <span>ذكرني</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>

            {/* Next Card Peek (Left side in RTL) */}
            {totalUpcoming > 1 && (
              <div
                onClick={() => setUpcomingIndex((p) => (p < totalUpcoming - 1 ? p + 1 : 0))}
                className={`hidden md:block absolute -end-14 lg:-end-10 w-[22%] lg:w-[20%] h-[82%] rounded-[32px] border ${nextTheme.border} opacity-40 blur-[0.5px] hover:opacity-65 transition-all duration-500 cursor-pointer overflow-hidden z-0 shadow-2xl pointer-events-auto`}
                aria-hidden="true"
                title="المباراة التالية"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: 'url(/stadium-cinematic.png)' }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(circle at center, ${nextTheme.glow} 0%, rgba(15, 23, 42, 0.9) 80%)`,
                  }}
                />
              </div>
            )}
          </div>

          {/* Carousel Pagination Dots */}
          {totalUpcoming > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 no-share-capture">
              {upcomingList.map((m, i) => {
                const isActive = i === upcomingIndex
                const dotTheme = COLOR_THEMES[i % COLOR_THEMES.length]
                return (
                  <button
                    key={m.id || i}
                    type="button"
                    onClick={() => setUpcomingIndex(i)}
                    aria-label={`المباراة رقم ${i + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive
                        ? `w-7 ${dotTheme.dot}`
                        : 'w-2 bg-slate-500/40 hover:bg-slate-400'
                    }`}
                    title={`الانتقال إلى المباراة ${i + 1}`}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. شريط آخر النتائج المكتملة (News Results Ticker with Compact Logos & Continuous Loop) */}
      {displayRecent.length > 0 && (
        <div
          className={`ticker-container mt-2.5 flex items-center gap-2 overflow-hidden rounded-2xl border px-3 py-1.5 transition-colors relative ${
            isDark
              ? 'bg-[#14221C] border-emerald-900/40 text-slate-300 shadow-sm'
              : 'bg-white border-slate-200/80 text-slate-700 shadow-2xs'
          }`}
          title="مرر الفأرة فوق الشريط للتوقف وقراءة النتائج"
        >
          {/* شارة ثابتة في البداية: آخر النتائج */}
          <div className="relative z-10 flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-[#10B981] px-2.5 py-1 text-[11px] font-black text-white shadow-sm select-none">
            <Zap className="size-3.5 fill-white" />
            <span className="whitespace-nowrap">آخر النتائج</span>
          </div>

          {/* تدرج تلاشي ناعم في الأطراف */}
          <div className={`pointer-events-none absolute inset-y-0 start-[105px] w-6 z-1 ${isDark ? 'bg-gradient-to-l from-transparent to-[#14221C]' : 'bg-gradient-to-l from-transparent to-white'}`} />
          <div className={`pointer-events-none absolute inset-y-0 end-0 w-8 z-1 ${isDark ? 'bg-gradient-to-r from-transparent to-[#14221C]' : 'bg-gradient-to-r from-transparent to-white'}`} />

          {/* المسار المتحرك باستمرار وبسلاسة مع ميزة التوقف عند تمرير الفأرة */}
          <div className="flex-1 overflow-hidden relative">
            <div className="animate-ticker-marquee flex items-center gap-3 py-0.5 whitespace-nowrap cursor-default">
              {/* المجموعة الأولى */}
              {displayRecent.map((item, idx) => (
                <TickerItem key={`rec-a-${item.id || idx}`} item={item} isDark={isDark} />
              ))}
              {/* المجموعة المكررة لضمان حركة مستمرة وانسيابية لا نهائية */}
              {displayRecent.map((item, idx) => (
                <TickerItem key={`rec-b-${item.id || idx}`} item={item} isDark={isDark} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}


