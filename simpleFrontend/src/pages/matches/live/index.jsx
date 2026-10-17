import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Calendar,
  Clock,
  Copy,
  Check,
  MapPin,
  Trophy,
  User,
  Shield,
  AlertTriangle,
  Loader2,
  Share2,
  Users,
  ArrowDown,
  ArrowUp,
  Info,
} from 'lucide-react'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'

export default function PublicLiveMatchPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [match, setMatch] = useState(null)
  const [events, setEvents] = useState([])
  const [lineup, setLineup] = useState(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'lineup' | 'details'
  const [lineupTeamFilter, setLineupTeamFilter] = useState('all') // 'all' | 'home' | 'away'

  const lastEventIdRef = useRef(0)
  const lastServerTimeRef = useRef(null)
  const isFinishedRef = useRef(false)
  const isOfficialRef = useRef(false)
  const pollIntervalRef = useRef(null)
  const isFetchingRef = useRef(false)
  const eventsMapRef = useRef(new Map())

  // Generate deterministic unique key for any event to prevent duplicate rendering
  const getEventKey = useCallback((ev) => {
    if (ev.id != null && String(ev.id).trim() !== '') {
      return `id_${ev.id}`
    }
    return `k_${ev.type}_${ev.minute}_${ev.team_id || ''}_${ev.player_id || ev.player_name || ''}`
  }, [])

  // Inject noindex robots meta tag
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]')
    const created = !meta
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    meta.content = 'noindex, nofollow'

    return () => {
      if (created && meta.parentNode) {
        meta.parentNode.removeChild(meta)
      }
    }
  }, [])

  // Incremental polling fetch with concurrency guard and idempotent deduplication
  const fetchUpdate = useCallback(async (isInitial = false) => {
    if (!token) return
    if (isFetchingRef.current) return // Prevent overlapping concurrent requests

    isFetchingRef.current = true

    try {
      const params = {}
      if (!isInitial && lastEventIdRef.current > 0) {
        params.since_id = lastEventIdRef.current
        if (lastServerTimeRef.current) {
          params.since_time = lastServerTimeRef.current
        }
      }

      const res = await api.get(`/live/${token}/data`, { params })
      const data = res.data

      if (!data || !data.match) {
        if (isInitial) setError('المباراة غير موجودة')
        return
      }

      const m = data.match
      setMatch(m)

      if (data.lineup) {
        setLineup(data.lineup)
      }

      if (data.server_time) {
        lastServerTimeRef.current = data.server_time
      }

      if (m.is_finished && m.is_official) {
        isFinishedRef.current = true
        isOfficialRef.current = true
      }

      if (isInitial) {
        // Initial load: populate Map with all events
        eventsMapRef.current.clear()
        if (Array.isArray(data.events)) {
          for (const ev of data.events) {
            eventsMapRef.current.set(getEventKey(ev), ev)
          }
        }

        const sortedList = Array.from(eventsMapRef.current.values()).sort(
          (a, b) => (Number(b.minute) || 0) - (Number(a.minute) || 0) || (Number(b.id) || 0) - (Number(a.id) || 0)
        )
        setEvents(sortedList)

        if (data.last_event_id) {
          lastEventIdRef.current = Number(data.last_event_id) || 0
        }
        setLoading(false)
      } else {
        // Incremental update: update modified events in-place
        let hasChanges = false

        // If total count is less than our stored count, server deleted some events -> resync
        if (data.total_events != null && data.total_events < eventsMapRef.current.size) {
          eventsMapRef.current.clear()
          if (Array.isArray(data.events)) {
            for (const ev of data.events) {
              eventsMapRef.current.set(getEventKey(ev), ev)
            }
          }
          hasChanges = true
        }

        if (Array.isArray(data.updated_events) && data.updated_events.length > 0) {
          for (const ev of data.updated_events) {
            const key = getEventKey(ev)
            if (eventsMapRef.current.has(key)) {
              eventsMapRef.current.set(key, { ...eventsMapRef.current.get(key), ...ev })
              hasChanges = true
            }
          }
        }

        // Merge newly added events exactly once
        if (Array.isArray(data.events) && data.events.length > 0) {
          for (const ev of data.events) {
            const key = getEventKey(ev)
            if (!eventsMapRef.current.has(key)) {
              eventsMapRef.current.set(key, ev)
              hasChanges = true
            }
          }
        }

        if (data.last_event_id) {
          const srvLastId = Number(data.last_event_id) || 0
          if (srvLastId > 0) {
            lastEventIdRef.current = srvLastId
          }
        }

        if (hasChanges) {
          const sortedList = Array.from(eventsMapRef.current.values()).sort(
            (a, b) => (Number(b.minute) || 0) - (Number(a.minute) || 0) || (Number(b.id) || 0) - (Number(a.id) || 0)
          )
          setEvents(sortedList)
        }
      }
    } catch (err) {
      if (isInitial) {
        setError(err.response?.data?.message || 'المباراة غير موجودة أو انتهت صلاحية الرابط')
        setLoading(false)
      }
    } finally {
      isFetchingRef.current = false
    }
  }, [token, getEventKey])

  // Start polling
  const startPolling = useCallback(() => {
    if (pollIntervalRef.current || (isFinishedRef.current && isOfficialRef.current)) return
    pollIntervalRef.current = setInterval(() => {
      fetchUpdate(false)
    }, 5000)
  }, [fetchUpdate])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  // Initial load & Polling lifecycle
  useEffect(() => {
    fetchUpdate(true)
    startPolling()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        if (!isFinishedRef.current || !isOfficialRef.current) {
          fetchUpdate(false)
          startPolling()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchUpdate, startPolling, stopPolling])

  // Stop polling when match finishes and is official
  useEffect(() => {
    if (match?.is_finished && match?.is_official) {
      stopPolling()
    }
  }, [match?.is_finished, match?.is_official, stopPolling])

  // Copy link
  const handleCopyLink = () => {
    const url = window.location.href
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        toast.success('تم نسخ الرابط بنجاح!')
        setTimeout(() => setCopied(false), 2500)
      })
    } else {
      setCopied(true)
      toast.success('تم نسخ الرابط بنجاح!')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  // Resolve team association for any event
  const getEventTeam = useCallback((ev, home, away) => {
    const homeId = home?.id != null ? Number(home.id) : null
    const awayId = away?.id != null ? Number(away.id) : null
    const evTeamId = ev.team_id != null ? Number(ev.team_id) : null

    if (evTeamId && homeId && evTeamId === homeId) {
      return { id: homeId, name: home.name, logo: home.logo_url, isHome: true }
    }
    if (evTeamId && awayId && evTeamId === awayId) {
      return { id: awayId, name: away.name, logo: away.logo_url, isHome: false }
    }

    if (ev.team_name) {
      if (home?.name && ev.team_name === home.name) {
        return { id: homeId, name: home.name, logo: home.logo_url, isHome: true }
      }
      if (away?.name && ev.team_name === away.name) {
        return { id: awayId, name: away.name, logo: away.logo_url, isHome: false }
      }
      return { id: null, name: ev.team_name, logo: null, isHome: null }
    }

    return { id: null, name: '', logo: null, isHome: null }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800" dir="rtl">
        <Loader2 className="size-10 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-bold">جارٍ تحميل البث المباشر للمباراة...</p>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-lg font-black text-slate-800 mb-1">تعذر العثور على المباراة</h2>
        <p className="text-xs font-bold text-slate-500 mb-5 max-w-sm">{error || 'الرابط غير صحيح أو انتهت صلاحيته'}</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-extrabold text-xs shadow-sm hover:bg-emerald-700"
        >
          العودة للرئيسية
        </button>
      </div>
    )
  }

  const { home_team: homeTeam, away_team: awayTeam, stadium, tournament, fouls } = match
  const dateFormatted = match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'اليوم'
  const timeFormatted = match.scheduled_at ? new Date(match.scheduled_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' }) : '--:--'

  const homeScore = match.home_team?.score ?? match.home_score ?? 0
  const awayScore = match.away_team?.score ?? match.away_score ?? 0

  const totalLineupCount =
    (lineup?.home?.all?.length || 0) + (lineup?.away?.all?.length || 0)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16 selection:bg-emerald-500 selection:text-white" dir="rtl">
      <div className="max-w-xl mx-auto px-4 pt-3 sm:pt-6">

        {/* Top Header & Branding */}
        <header className="flex items-center justify-between py-2 mb-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="p-2 -ms-2 rounded-full hover:bg-slate-200/60 transition-colors text-slate-700"
            title="الرئيسية"
          >
            <ArrowRight className="size-6" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              ⚽
            </div>
            <div className="flex flex-col text-center">
              <span className="text-base font-black text-slate-900 leading-none">أجي تقصرو</span>
              <span className="text-[10px] font-bold text-emerald-600 tracking-wider">Aji Nqssro</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 -me-2 rounded-full hover:bg-slate-200/60 transition-colors text-slate-700"
            title="نسخ رابط المباراة"
          >
            <Share2 className="size-5 text-slate-600" />
          </button>
        </header>

        {/* Review Notice Banner */}
        {!match.is_official && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-200/90 p-3 text-amber-900 text-xs font-bold shadow-xs">
            <Clock className="size-4 shrink-0 text-amber-600 animate-pulse" />
            <span>⚠️ تنبيه: النتيجة والأحداث مسجلة من المندوب الميداني، وسيتم اعتمادها ومراجعتها من قبل اللجنة المنظمة.</span>
          </div>
        )}

        {/* Scoreboard Card — Strict Team-to-Score Binding */}
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-[#064E3B] via-[#04382A] to-[#022C22]">
          <div className="flex items-center justify-between gap-2 mb-3">
            {!match.is_official && (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[11px] font-black px-3 py-1 rounded-full shadow-xs">
                <AlertTriangle className="size-3.5 shrink-0 text-amber-300" />
                <span>النتيجة قيد المراجعة من طرف اللجنة</span>
              </span>
            )}
            <span className="ms-auto bg-white/20 border border-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-xl">
              {tournament?.group || tournament?.round || 'المجموعة 1'}
            </span>
          </div>

          {/* Teams & Score Row — In RTL, Column 1 is on the Right, Column 3 is on the Left */}
          <div className="grid grid-cols-3 items-center py-2 gap-2">
            {/* Home Team (Right Side in RTL) */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 shadow-lg flex items-center justify-center overflow-hidden mb-2">
                {homeTeam?.logo_url ? (
                  <img src={homeTeam.logo_url} alt={homeTeam.name} className="w-full h-full object-contain rounded-full" />
                ) : (
                  <div className="w-full h-full rounded-full bg-emerald-600 flex items-center justify-center text-white">
                    <Shield className="size-7" />
                  </div>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 px-1 min-h-[2rem] flex items-center justify-center">
                {homeTeam?.name || 'الفريق الأول'}
              </h3>
              {/* Dedicated Home Score Badge attached directly to Home Team */}
              <div className="mt-2 inline-flex items-center justify-center min-w-10 h-8 px-2.5 rounded-xl bg-white/15 border border-white/25 text-white font-black text-lg sm:text-xl tabular-nums shadow-xs">
                {homeScore}
              </div>
            </div>

            {/* Center Score & Match Status — Explicit RTL Layout */}
            <div className="flex flex-col items-center justify-center text-center px-1">
              <div className="flex items-center justify-center gap-2 sm:gap-3 my-1" dir="rtl">
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                  {homeScore}
                </span>
                <span className="text-xl sm:text-2xl font-light text-white/50">-</span>
                <span className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                  {awayScore}
                </span>
              </div>

              <div className="mt-1">
                {match.is_live ? (
                  <span className="inline-flex items-center gap-1.5 bg-rose-500 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-xs animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span>مباشر</span>
                    {match.current_minute > 0 && <span className="font-bold tabular-nums">({match.current_minute}')</span>}
                  </span>
                ) : match.is_finished ? (
                  <span className="bg-emerald-950/60 border border-emerald-400/30 text-emerald-200 font-extrabold text-xs px-3 py-1 rounded-full">
                    <span>انتهت</span>
                  </span>
                ) : (
                  <span className="bg-white/15 text-white/90 font-extrabold text-xs px-3 py-1 rounded-full">
                    <span>{match.status_text}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Away Team (Left Side in RTL) */}
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white p-1.5 shadow-lg flex items-center justify-center overflow-hidden mb-2">
                {awayTeam?.logo_url ? (
                  <img src={awayTeam.logo_url} alt={awayTeam.name} className="w-full h-full object-contain rounded-full" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-700 flex items-center justify-center text-white">
                    <Shield className="size-7" />
                  </div>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 px-1 min-h-[2rem] flex items-center justify-center">
                {awayTeam?.name || 'الفريق الثاني'}
              </h3>
              {/* Dedicated Away Score Badge attached directly to Away Team */}
              <div className="mt-2 inline-flex items-center justify-center min-w-10 h-8 px-2.5 rounded-xl bg-white/15 border border-white/25 text-white font-black text-lg sm:text-xl tabular-nums shadow-xs">
                {awayScore}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Info Cards */}
        <div className="grid grid-cols-3 gap-2 my-3">
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
              <MapPin className="size-4" />
            </div>
            <span className="text-xs font-black text-slate-800 line-clamp-1 leading-tight">{stadium?.name}</span>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{stadium?.city}</span>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
              <Calendar className="size-4" />
            </div>
            <span className="text-xs font-black text-slate-800 line-clamp-1 leading-tight">{dateFormatted}</span>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{timeFormatted}</span>
          </div>

          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
              <Trophy className="size-4" />
            </div>
            <span className="text-xs font-black text-slate-800 line-clamp-1 leading-tight">{tournament?.name}</span>
            <span className="text-[10px] font-bold text-slate-400 mt-0.5">{tournament?.round}</span>
          </div>
        </div>

        {/* Foul Counters Panel (if enabled) */}
        {fouls && fouls.enabled && (
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs mb-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="size-4 text-amber-500" />
                <span className="text-xs font-black text-slate-800">عداد الأخطاء التراكمية (Fouls)</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">الحد الأقصى: {fouls.threshold || 5} أخطاء</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-center">
              <div className={`p-2.5 rounded-xl border transition-colors ${fouls.home_penalty ? 'bg-rose-50 border-rose-300' : fouls.home_warning ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-[11px] font-extrabold text-slate-700 block truncate">{homeTeam?.name}</span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className={`text-xl font-black tabular-nums ${fouls.home_penalty ? 'text-rose-600' : fouls.home_warning ? 'text-amber-600' : 'text-slate-800'}`}>
                    {fouls.home_count}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">أخطاء</span>
                </div>
                {fouls.home_penalty && <span className="text-[10px] font-black text-rose-600 block mt-1">⚠️ ركلة جزاء (تجاوز 5 أخطاء)</span>}
                {!fouls.home_penalty && fouls.home_warning && <span className="text-[10px] font-black text-amber-600 block mt-1">وصل للحد الأقصى (5 أخطاء)</span>}
              </div>

              <div className={`p-2.5 rounded-xl border transition-colors ${fouls.away_penalty ? 'bg-rose-50 border-rose-300' : fouls.away_warning ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-100'}`}>
                <span className="text-[11px] font-extrabold text-slate-700 block truncate">{awayTeam?.name}</span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <span className={`text-xl font-black tabular-nums ${fouls.away_penalty ? 'text-rose-600' : fouls.away_warning ? 'text-amber-600' : 'text-slate-800'}`}>
                    {fouls.away_count}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">أخطاء</span>
                </div>
                {fouls.away_penalty && <span className="text-[10px] font-black text-rose-600 block mt-1">⚠️ ركلة جزاء (تجاوز 5 أخطاء)</span>}
                {!fouls.away_penalty && fouls.away_warning && <span className="text-[10px] font-black text-amber-600 block mt-1">وصل للحد الأقصى (5 أخطاء)</span>}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs: Events | Present Lineup | Match Details */}
        <div className="flex items-center bg-slate-200/70 p-1 rounded-2xl mb-3 text-xs font-black gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'events'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="size-4" />
            <span>الأحداث</span>
            {events.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                activeTab === 'events' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
              }`}>
                {events.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lineup')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'lineup'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="size-4" />
            <span>التشكيلة الحاضرة</span>
            {totalLineupCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums ${
                activeTab === 'lineup' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-300 text-slate-700'
              }`}>
                {totalLineupCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'details'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Info className="size-4" />
            <span>تفاصيل المباراة</span>
          </button>
        </div>

        {/* TAB 1: Match Events */}
        {activeTab === 'events' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs mb-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="size-4" />
                </div>
                <h2 className="text-sm font-black text-slate-800">أحداث المباراة</h2>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                  <span className={`w-2 h-2 rounded-full ${match.is_live ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span>{match.is_live ? 'مباشر (تحديث تلقائي)' : match.is_finished ? 'ملخص نهائي' : 'في الانتظار'}</span>
                </span>
              </div>
            </div>

            {/* Events List — Guaranteed Deduplicated & Explicit Team Attribution */}
            <div className="space-y-2.5">
              {events.length > 0 ? (
                events.map((ev) => {
                  const evTeam = getEventTeam(ev, homeTeam, awayTeam)
                  return (
                    <div
                      key={getEventKey(ev)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 transition-all hover:bg-slate-50"
                    >
                      <span className="text-xs font-black text-slate-400 tabular-nums shrink-0 min-w-8 text-center">
                        {ev.minute}'
                      </span>

                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 bg-white shadow-2xs border border-slate-100">
                        {['goal', 'penalty_goal'].includes(ev.type) ? (
                          <span>⚽</span>
                        ) : ev.type === 'yellow_card' || (ev.type === 'foul' && ev.punishment === 'yellow') ? (
                          <span className="w-3.5 h-4.5 bg-amber-400 rounded-xs inline-block shadow-2xs" />
                        ) : ev.type === 'red_card' || (ev.type === 'foul' && ev.punishment === 'red') ? (
                          <span className="w-3.5 h-4.5 bg-rose-500 rounded-xs inline-block shadow-2xs" />
                        ) : ev.type === 'second_yellow' || (ev.type === 'foul' && ev.punishment === 'second_yellow') ? (
                          <span className="text-[10px]">🟨🟥</span>
                        ) : ev.type === 'substitution' ? (
                          <span>🔄</span>
                        ) : ev.type === 'foul' ? (
                          <span>🛑</span>
                        ) : (
                          <span>📌</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {ev.player_name || 'حدث'}
                          </span>
                          {['goal', 'penalty_goal'].includes(ev.type) && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">هدف</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-0.5">
                          {evTeam.logo && (
                            <img src={evTeam.logo} alt="" className="w-3.5 h-3.5 rounded-full object-contain inline-block shrink-0" />
                          )}
                          <span className="truncate text-emerald-800 font-extrabold">
                            {evTeam.name || ev.team_name}
                          </span>
                          {ev.assist_player_name && <span>• تمريرة: {ev.assist_player_name}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 px-4 text-slate-400">
                  <Clock className="size-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold">لا توجد أحداث مسجلة بعد</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">سيتم تحديث الأحداث والأهداف فور تسجيلها مباشرة</p>
                </div>
              )}

              {match.is_finished && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80">
                  <span className="text-xs font-black text-emerald-700 shrink-0 min-w-8 text-center">90'</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm shrink-0">
                    ⏱️
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-emerald-950 block">نهاية المباراة</span>
                    <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 mt-0.5" dir="rtl">
                      <span>النتيجة النهائية:</span>
                      <span className="font-extrabold">{homeTeam?.name} ({homeScore})</span>
                      <span>-</span>
                      <span className="font-extrabold">({awayScore}) {awayTeam?.name}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Referee & Match status footer */}
            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="size-4 text-emerald-600 shrink-0" />
                <span className="font-bold">الحكم:</span>
                <span className="font-extrabold text-slate-800 truncate">{match.referee_name}</span>
              </div>

              <div className="flex items-center justify-end gap-1.5 text-slate-500">
                <span className={`w-2 h-2 rounded-full ${match.is_live ? 'bg-rose-500 animate-pulse' : 'bg-emerald-600'}`} />
                <span className="font-bold">الحالة:</span>
                <span className="font-extrabold text-slate-800">{match.status_text}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Present Lineup (التشكيلة الحاضرة) */}
        {activeTab === 'lineup' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs mb-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users className="size-4" />
                </div>
                <h2 className="text-sm font-black text-slate-800">التشكيلة الحاضرة</h2>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                {lineup?.available ? 'تشكيلة معتمدة' : 'في انتظار الحضور'}
              </span>
            </div>

            {/* Team Selector Filter */}
            <div className="flex items-center gap-1.5 mb-3 bg-slate-100/70 p-1 rounded-xl text-xs font-extrabold">
              <button
                type="button"
                onClick={() => setLineupTeamFilter('all')}
                className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
                  lineupTeamFilter === 'all' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الفريقان معاً
              </button>
              <button
                type="button"
                onClick={() => setLineupTeamFilter('home')}
                className={`flex-1 py-1.5 rounded-lg text-center truncate px-2 transition-all ${
                  lineupTeamFilter === 'home' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {homeTeam?.name || 'الفريق الأول'}
              </button>
              <button
                type="button"
                onClick={() => setLineupTeamFilter('away')}
                className={`flex-1 py-1.5 rounded-lg text-center truncate px-2 transition-all ${
                  lineupTeamFilter === 'away' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {awayTeam?.name || 'الفريق الثاني'}
              </button>
            </div>

            {/* Lineup Content */}
            {lineup && (lineup.home?.all?.length > 0 || lineup.away?.all?.length > 0) ? (
              <div className="space-y-4">
                {/* Home Team Squad */}
                {(lineupTeamFilter === 'all' || lineupTeamFilter === 'home') && (
                  <div className="rounded-2xl border border-slate-200/80 p-3 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-white p-1 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {homeTeam?.logo_url ? (
                          <img src={homeTeam.logo_url} alt="" className="w-full h-full object-contain rounded-full" />
                        ) : (
                          <Shield className="size-4 text-emerald-600" />
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-800 truncate">{homeTeam?.name}</span>
                      <span className="ms-auto text-[10px] font-bold text-slate-400">
                        {lineup.home.all.length} لاعب حاضر
                      </span>
                    </div>

                    {lineup.has_starters && lineup.home.starters.length > 0 ? (
                      <div className="space-y-3">
                        {/* Starters */}
                        <div>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mb-1.5">
                            الأساسيون
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {lineup.home.starters.map((p) => (
                              <PlayerLineupCard key={p.id} player={p} />
                            ))}
                          </div>
                        </div>

                        {/* Substitutes */}
                        {lineup.home.substitutes.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block mb-1.5">
                              البدلاء
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {lineup.home.substitutes.map((p) => (
                                <PlayerLineupCard key={p.id} player={p} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {lineup.home.all.map((p) => (
                          <PlayerLineupCard key={p.id} player={p} />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Away Team Squad */}
                {(lineupTeamFilter === 'all' || lineupTeamFilter === 'away') && (
                  <div className="rounded-2xl border border-slate-200/80 p-3 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200">
                      <div className="w-7 h-7 rounded-full bg-white p-1 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                        {awayTeam?.logo_url ? (
                          <img src={awayTeam.logo_url} alt="" className="w-full h-full object-contain rounded-full" />
                        ) : (
                          <Shield className="size-4 text-slate-600" />
                        )}
                      </div>
                      <span className="text-xs font-black text-slate-800 truncate">{awayTeam?.name}</span>
                      <span className="ms-auto text-[10px] font-bold text-slate-400">
                        {lineup.away.all.length} لاعب حاضر
                      </span>
                    </div>

                    {lineup.has_starters && lineup.away.starters.length > 0 ? (
                      <div className="space-y-3">
                        {/* Starters */}
                        <div>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md inline-block mb-1.5">
                            الأساسيون
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {lineup.away.starters.map((p) => (
                              <PlayerLineupCard key={p.id} player={p} />
                            ))}
                          </div>
                        </div>

                        {/* Substitutes */}
                        {lineup.away.substitutes.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md inline-block mb-1.5">
                              البدلاء
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {lineup.away.substitutes.map((p) => (
                                <PlayerLineupCard key={p.id} player={p} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {lineup.away.all.map((p) => (
                          <PlayerLineupCard key={p.id} player={p} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 px-4 text-slate-400">
                <Users className="size-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold">لم يتم تسجيل تشكيلة الحضور بعد</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  سيتم عرض اللاعبين الحاضرين والتشكيلة الأساسية فور اعتمادها من مندوب المباراة
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Match Details */}
        {activeTab === 'details' && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs mb-3 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Info className="size-4" />
              </div>
              <h2 className="text-sm font-black text-slate-800">تفاصيل وبيانات المباراة</h2>
            </div>

            {/* Stadium & Tournament details */}
            <div className="grid grid-cols-1 gap-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500">الملعب:</span>
                <span className="font-extrabold text-slate-900">{stadium?.name} ({stadium?.city})</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500">البطولة / المنافسة:</span>
                <span className="font-extrabold text-slate-900">{tournament?.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500">الدور / المجموعة:</span>
                <span className="font-extrabold text-slate-900">{tournament?.round || tournament?.group || 'المجموعة 1'}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500">التاريخ والتوقيت:</span>
                <span className="font-extrabold text-slate-900">{dateFormatted} - {timeFormatted}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500">حكم المباراة:</span>
                <span className="font-extrabold text-slate-900">{match.referee_name}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-500">الاعتماد:</span>
                <span className={`font-extrabold ${match.is_official ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {match.is_official ? 'معتمدة ورسمية' : 'غير رسمية (في انتظار مصادقة اللجنة)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp & Copy Action */}
        <div className="space-y-2 mt-4">
          <a
            href={match.share?.whatsapp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-sm py-3 px-4 rounded-2xl shadow-sm active:scale-[0.99] transition-all"
          >
            <span>مشاركة المباراة عبر WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-sm py-2.5 px-4 rounded-2xl border border-slate-200/90 shadow-2xs active:scale-[0.99] transition-all"
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4 text-slate-500" />}
            <span>{copied ? 'تم نسخ الرابط بنجاح!' : 'نسخ رابط المتابعة المباشرة'}</span>
          </button>
        </div>

      </div>
    </div>
  )
}

/**
 * Individual player card in Present Lineup section
 */
function PlayerLineupCard({ player }) {
  const isStarter = player.participation_status === 'starter' || player.is_starter
  const isSubbedOut = player.participation_status === 'subbed_out'
  const isSubbedIn = player.participation_status === 'subbed_in'

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
      {/* Shirt Number */}
      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-black text-[11px] tabular-nums flex items-center justify-center shrink-0">
        {player.number != null ? player.number : '-'}
      </span>

      {/* Photo or Avatar */}
      <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
        {player.photo_url ? (
          <img src={player.photo_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <User className="size-4 text-slate-400" />
        )}
      </div>

      {/* Name & Captain */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-900 truncate">{player.name}</span>
          {player.is_captain && (
            <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1 py-0.2 rounded-xs shrink-0">
              © كابتن
            </span>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="shrink-0">
        {isSubbedOut ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md">
            <ArrowDown className="size-2.5 text-rose-600" />
            <span>خرج</span>
          </span>
        ) : isSubbedIn ? (
          <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
            <ArrowUp className="size-2.5 text-emerald-600" />
            <span>دخل</span>
          </span>
        ) : isStarter ? (
          <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md">
            أساسي
          </span>
        ) : (
          <span className="text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
            {player.status_label || 'حاضر'}
          </span>
        )}
      </div>
    </div>
  )
}
