import React, { useEffect, useRef, useState, useCallback } from 'react'
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
  const [copied, setCopied] = useState(false)

  const lastEventIdRef = useRef(0)
  const lastServerTimeRef = useRef(null)
  const isFinishedRef = useRef(false)
  const isOfficialRef = useRef(false)
  const pollIntervalRef = useRef(null)

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

  // Incremental polling fetch
  const fetchUpdate = useCallback(async (isInitial = false) => {
    if (!token) return

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

      if (data.server_time) {
        lastServerTimeRef.current = data.server_time
      }

      if (m.is_finished && m.is_official) {
        isFinishedRef.current = true
        isOfficialRef.current = true
      }

      if (isInitial) {
        setEvents(data.events || [])
        if (data.last_event_id) {
          lastEventIdRef.current = data.last_event_id
        }
        setLoading(false)
      } else {
        // Apply updated events (player corrections, etc.)
        if (Array.isArray(data.updated_events) && data.updated_events.length > 0) {
          setEvents((prev) =>
            prev.map((ev) => {
              const updated = data.updated_events.find((u) => u.id === ev.id)
              return updated || ev
            })
          )
        }

        // Prepend newly added events
        if (Array.isArray(data.events) && data.events.length > 0) {
          setEvents((prev) => {
            const existingIds = new Set(prev.map((e) => e.id))
            const newOnes = data.events.filter((e) => !existingIds.has(e.id))
            return [...newOnes, ...prev].sort((a, b) => b.minute - a.minute || b.id - a.id)
          })
          if (data.last_event_id && data.last_event_id > lastEventIdRef.current) {
            lastEventIdRef.current = data.last_event_id
          }
        }
      }
    } catch (err) {
      if (isInitial) {
        setError(err.response?.data?.message || 'المباراة غير موجودة أو انتهت صلاحية الرابط')
        setLoading(false)
      }
    }
  }, [token])

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

        {/* Scoreboard Card (Mockup Reference) */}
        <div className="relative overflow-hidden rounded-3xl p-5 text-white shadow-xl bg-gradient-to-br from-[#064E3B] via-[#04382A] to-[#022C22]">
          <div className="flex items-center justify-between gap-2 mb-3">
            {!match.is_official && (
              <span className="inline-flex items-center gap-1 bg-amber-500/25 border border-amber-400/40 text-amber-200 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
                <AlertTriangle className="size-3 shrink-0" />
                <span>النتيجة غير رسمية</span>
              </span>
            )}
            <span className="ms-auto bg-white/20 border border-white/20 text-white text-[11px] font-bold px-3 py-1 rounded-xl">
              {tournament?.group || tournament?.round || 'المجموعة 1'}
            </span>
          </div>

          {/* Teams & Score Row */}
          <div className="grid grid-cols-3 items-center py-2">
            {/* Home Team */}
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
              <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 px-1">
                {homeTeam?.name || 'الفريق الأول'}
              </h3>
            </div>

            {/* Score & Status */}
            <div className="flex flex-col items-center justify-center text-center px-1">
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums my-1">
                <span>{match.home_score}</span>
                <span className="opacity-60 mx-1">-</span>
                <span>{match.away_score}</span>
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

            {/* Away Team */}
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
              <h3 className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 px-1">
                {awayTeam?.name || 'الفريق الثاني'}
              </h3>
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

        {/* Foul Counters Panel */}
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

        {/* Match Events Card */}
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

          {/* Events List */}
          <div className="space-y-2.5">
            {events.length > 0 ? (
              events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100 transition-all">
                  <span className="text-xs font-black text-slate-400 tabular-nums shrink-0 min-w-8 text-center">
                    {ev.minute}'
                  </span>

                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 bg-white shadow-2xs border border-slate-100">
                    {['goal', 'penalty_goal'].includes(ev.type) ? (
                      <span>⚽</span>
                    ) : ev.type === 'yellow_card' || (ev.type === 'foul' && ev.punishment === 'yellow') ? (
                      <span className="w-3.5 h-4.5 bg-amber-400 rounded-xs inline-block" />
                    ) : ev.type === 'red_card' || (ev.type === 'foul' && ev.punishment === 'red') ? (
                      <span className="w-3.5 h-4.5 bg-rose-500 rounded-xs inline-block" />
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
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 mt-0.5">
                      <span className="truncate text-emerald-800 font-extrabold">{ev.team_name}</span>
                      {ev.assist_player_name && <span>• تمريرة: {ev.assist_player_name}</span>}
                    </div>
                  </div>
                </div>
              ))
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
                  <span className="text-[10px] font-bold text-emerald-800">
                    النتيجة النهائية: {match.home_score} - {match.away_score}
                  </span>
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
