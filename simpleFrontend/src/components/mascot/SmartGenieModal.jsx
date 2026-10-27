import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Trophy,
  MapPin,
  X,
  Phone,
  Shield,
  ChevronLeft,
  ArrowRight,
  HelpCircle,
  Calendar,
  Clock,
  RotateCcw,
  LogIn,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
} from 'lucide-react'
import GenieMascot from './GenieMascot'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useMascotSettings } from '../../utils/mascotSettings'

export default function SmartGenieModal() {
  const settings = useMascotSettings()
  const { user } = useAuth()

  const [open, setOpen] = useState(false)
  const [contextLoading, setContextLoading] = useState(false)
  const [contextError, setContextError] = useState(false)
  const [contextData, setContextData] = useState(null)

  // Current question & answer state (kept purely in memory, never persisted)
  const [activeQuestion, setActiveQuestion] = useState(null)
  const [answerLoading, setAnswerLoading] = useState(false)
  const [answerData, setAnswerData] = useState(null)
  const [answerError, setAnswerError] = useState(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  // Fetch server-driven role and context on modal open
  const loadContext = useCallback(async () => {
    setContextLoading(true)
    setContextError(false)
    setSessionExpired(false)
    try {
      const response = await api.get('/genie/context')
      setContextData(response.data)
    } catch {
      setContextError(true)
    } finally {
      setContextLoading(false)
    }
  }, [])

  // Clear chat/question state on user change or logout
  const currentUserId = user?.id ?? null
  const prevUserIdRef = useRef(currentUserId)

  useEffect(() => {
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId
      setActiveQuestion(null)
      setAnswerData(null)
      setAnswerError(null)
      setSessionExpired(false)
      if (open) {
        loadContext()
      } else {
        setContextData(null)
      }
    }
  }, [currentUserId, open, loadContext])

  useEffect(() => {
    if (open) {
      loadContext()
    } else {
      setActiveQuestion(null)
      setAnswerData(null)
      setAnswerError(null)
      setSessionExpired(false)
    }
  }, [open, loadContext])

  if (settings.mascot_enabled === false) return null

  const handleOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  // Fetch personalized answer inside the window
  const handleSelectQuestion = async (suggestion) => {
    setActiveQuestion(suggestion)
    setAnswerLoading(true)
    setAnswerData(null)
    setAnswerError(null)
    setSessionExpired(false)

    try {
      const response = await api.get(suggestion.endpoint)
      setAnswerData(response.data)
    } catch (err) {
      const status = err.response?.status
      if (status === 401) {
        setSessionExpired(true)
      } else {
        setAnswerError('تعذّر جلب البيانات. أعد المحاولة.')
      }
    } finally {
      setAnswerLoading(false)
    }
  }

  const handleRetryAnswer = () => {
    if (activeQuestion) {
      handleSelectQuestion(activeQuestion)
    }
  }

  const handleBackToSuggestions = () => {
    setActiveQuestion(null)
    setAnswerData(null)
    setAnswerError(null)
    setSessionExpired(false)
  }

  return (
    <aside
      aria-label="الجني الذكي"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] end-4 sm:bottom-6 sm:end-6 z-50 flex flex-col items-end select-none"
      dir="rtl"
    >
      {/* Interactive Contextual Modal Popup */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="genie-modal-title"
          className="fade-in mb-3 w-[360px] sm:w-[400px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[20px] border border-[#10B981] bg-[#0F172A] text-white shadow-2xl shadow-emerald-950/80 ring-1 ring-[#10B981]/30 flex flex-col max-h-[75vh] animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header: Title, Mascot with Online Dot, and >=44px Close Button */}
          <div className="flex items-center justify-between gap-3 border-b border-emerald-500/20 bg-[#0a101d] px-4 py-3">
            <div className="flex items-center gap-3">
              <GenieMascot size={42} border status={true} animated />
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="genie-modal-title" className="text-sm font-black text-white">
                    الجني الذكي
                  </h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>متاح الآن</span>
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  مرشدك الذكي لخدمات منصة أجي نقصرو
                </p>
              </div>
            </div>

            {/* Close button with min-width and min-height >= 44px */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="إغلاق نافذة الجني الذكي"
              className="grid min-w-[44px] min-h-[44px] size-11 place-items-center rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-emerald-500/40 border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {contextLoading || (!contextData && !contextError) ? (
              <div className="space-y-3 py-6">
                <div className="h-14 rounded-xl bg-slate-800/60 animate-pulse" />
                <div className="h-10 rounded-xl bg-slate-800/40 animate-pulse" />
                <div className="h-10 rounded-xl bg-slate-800/40 animate-pulse" />
                <div className="h-10 rounded-xl bg-slate-800/40 animate-pulse" />
              </div>
            ) : contextError ? (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-center space-y-3">
                <AlertCircle className="size-6 text-rose-400 mx-auto" />
                <p className="text-xs text-rose-300 font-semibold">
                  تعذّر جلب البيانات. يرجى إعادة المحاولة.
                </p>
                <button
                  type="button"
                  onClick={loadContext}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-500 transition-colors"
                >
                  <RotateCcw className="size-3.5" />
                  <span>إعادة المحاولة</span>
                </button>
              </div>
            ) : (
              <>
                {/* Personalized Welcome Speech Bubble */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3.5 shadow-inner">
                  <div className="flex items-start gap-2.5">
                    <div className="shrink-0 mt-0.5">
                      <Sparkles className="size-4 text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black text-emerald-300 leading-relaxed">
                        {contextData?.greeting || 'مرحبًا بك في أجي نقصرو. كيف أساعدك؟'}
                      </p>
                      {!activeQuestion && (
                        <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
                          اختر أحد الاقتراحات السريعة للحصول على إجابة فورية داخل هذه النافذة:
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* View Mode: Selected Question Answer OR Suggestions List */}
                {activeQuestion ? (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <button
                      type="button"
                      onClick={handleBackToSuggestions}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      <ArrowRight className="size-3.5" />
                      <span>العودة للاقتراحات</span>
                    </button>

                    <div className="rounded-xl border border-slate-700/80 bg-slate-800/60 p-3.5 space-y-3">
                      <div className="flex items-start gap-2 text-white font-black text-xs sm:text-sm">
                        <HelpCircle className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{activeQuestion.title}</span>
                      </div>

                      {/* State 1: Answer Loading Skeleton */}
                      {answerLoading && (
                        <div className="space-y-2 py-4">
                          <div className="h-4 rounded bg-slate-700/50 animate-pulse w-3/4" />
                          <div className="h-4 rounded bg-slate-700/40 animate-pulse w-1/2" />
                          <div className="h-4 rounded bg-slate-700/40 animate-pulse w-5/6" />
                        </div>
                      )}

                      {/* State 2: Session Expired / Authentication Required */}
                      {!answerLoading && sessionExpired && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5 text-center space-y-2.5">
                          <LogIn className="size-5 text-amber-400 mx-auto" />
                          <p className="text-xs font-bold text-amber-300">
                            لعرض هذه المعلومة سجّل الدخول أولًا.
                          </p>
                          <Link
                            to="/login"
                            onClick={handleClose}
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white transition-colors"
                          >
                            <LogIn className="size-3.5" />
                            <span>تسجيل الدخول</span>
                          </Link>
                        </div>
                      )}

                      {/* State 3: Error State */}
                      {!answerLoading && !sessionExpired && answerError && (
                        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3.5 text-center space-y-2.5">
                          <p className="text-xs font-semibold text-rose-300">{answerError}</p>
                          <button
                            type="button"
                            onClick={handleRetryAnswer}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs font-bold text-white transition-colors cursor-pointer"
                          >
                            <RotateCcw className="size-3.5" />
                            <span>إعادة المحاولة</span>
                          </button>
                        </div>
                      )}

                      {/* State 4: Empty Answer State */}
                      {!answerLoading && !sessionExpired && !answerError && answerData && !answerData.has_data && (
                        <div className="rounded-lg border border-slate-700 bg-[#0F172A]/80 p-3.5 text-center space-y-2">
                          <p className="text-xs font-black text-slate-200">
                            {answerData.message || 'لا توجد بيانات متاحة حاليًا.'}
                          </p>
                          {answerData.description && (
                            <p className="text-[11px] text-slate-400">{answerData.description}</p>
                          )}
                          {answerData.cta_link && answerData.cta_text && (
                            <div className="pt-1">
                              <Link
                                to={answerData.cta_link}
                                onClick={handleClose}
                                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-colors"
                              >
                                <span>{answerData.cta_text}</span>
                                <ChevronLeft className="size-3.5" />
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {/* State 5: Success Answer Cards */}
                      {!answerLoading && !sessionExpired && !answerError && answerData && answerData.has_data && (
                        <div className="space-y-3">
                          {/* Match Card Format */}
                          {answerData.card?.home_team && answerData.card?.away_team && (
                            <div className="rounded-xl border border-emerald-500/30 bg-[#0F172A] p-3 space-y-2.5 shadow-sm">
                              {answerData.card.title && (
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-1.5">
                                  <span>{answerData.card.title}</span>
                                  {answerData.card.status_label && (
                                    <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-400 font-bold">
                                      {answerData.card.status_label}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Teams Row */}
                              <div className="flex items-center justify-between gap-2 py-1 text-xs font-black text-white">
                                <span className="truncate text-emerald-300">{answerData.card.home_team}</span>
                                {answerData.card.score ? (
                                  <span className="shrink-0 px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-400 text-sm font-black">
                                    {answerData.card.score}
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-slate-500 text-[11px] font-bold">ضد</span>
                                )}
                                <span className="truncate text-slate-200">{answerData.card.away_team}</span>
                              </div>

                              {/* Date, Time & Stadium Details */}
                              <div className="space-y-1 pt-1 border-t border-slate-800/80 text-[11px] text-slate-300">
                                {answerData.card.date && (
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="size-3 text-slate-400 shrink-0" />
                                    <span>{answerData.card.date}</span>
                                    {answerData.card.time && (
                                      <>
                                        <span className="text-slate-600">•</span>
                                        <Clock className="size-3 text-slate-400 shrink-0" />
                                        <span>{answerData.card.time}</span>
                                      </>
                                    )}
                                  </div>
                                )}

                                {answerData.card.stadium && (
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="size-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{answerData.card.stadium}</span>
                                  </div>
                                )}

                                {answerData.card.result_summary && (
                                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                                    <CheckCircle2 className="size-3 shrink-0" />
                                    <span>{answerData.card.result_summary}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Tournament Standing / Committee / Terrain Summary Cards */}
                          {(!answerData.card?.home_team || !answerData.card?.away_team) && answerData.card && (
                            <div className="rounded-xl border border-emerald-500/30 bg-[#0F172A] p-3 space-y-2">
                              {answerData.card.title && (
                                <h4 className="text-xs font-black text-white">
                                  {answerData.card.title}
                                </h4>
                              )}

                              {answerData.card.rank && (
                                <div className="flex items-center justify-between text-xs font-bold text-slate-200 py-1">
                                  <span className="text-slate-400">الترتيب الحالي:</span>
                                  <span className="text-emerald-400 font-black text-sm">
                                    {answerData.card.rank}
                                  </span>
                                </div>
                              )}

                              {answerData.card.tournament_name && (
                                <div className="text-[11px] text-slate-300">
                                  <span className="text-slate-400">البطولة: </span>
                                  <span className="font-bold">{answerData.card.tournament_name}</span>
                                </div>
                              )}

                              {answerData.card.time_slot && (
                                <div className="text-[11px] text-slate-300">
                                  <span className="text-slate-400">التوقيت: </span>
                                  <span className="font-bold">{answerData.card.time_slot}</span>
                                </div>
                              )}

                              {answerData.card.customer && (
                                <div className="text-[11px] text-slate-300">
                                  <span className="text-slate-400">اسم الحاجز: </span>
                                  <span className="font-bold">{answerData.card.customer}</span>
                                </div>
                              )}

                              {answerData.card.summary && (
                                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                                  {answerData.card.summary}
                                </p>
                              )}

                              {answerData.card.advice && (
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  {answerData.card.advice}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Secondary 'عرض التفاصيل' Button beneath Answer */}
                          {answerData.cta_link && answerData.cta_text && (
                            <Link
                              to={answerData.cta_link}
                              onClick={handleClose}
                              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/40 px-3 py-2 text-xs font-black text-emerald-400 transition-colors"
                            >
                              <span>{answerData.cta_text}</span>
                              <ChevronLeft className="size-3.5" />
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Suggestions List */
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-400">
                      الاقتراحات المتاحة:
                    </p>

                    <div className="space-y-2">
                      {contextData?.suggestions?.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectQuestion(s)}
                          className="w-full text-start flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-800/50 hover:bg-slate-800 hover:border-emerald-500/50 p-2.5 text-xs font-semibold text-slate-200 hover:text-white transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                              <HelpCircle className="size-3.5" />
                            </span>
                            <span className="truncate">{s.title}</span>
                          </div>
                          <ChevronLeft className="size-4 text-slate-500 group-hover:text-emerald-400 group-hover:-translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Access Footer Shortcuts */}
          <div className="border-t border-slate-800 bg-[#0a101d] px-4 py-2.5 flex items-center justify-between gap-2 text-[11px]">
            <Link
              to="/fields"
              onClick={handleClose}
              className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 font-bold"
            >
              <MapPin className="size-3" />
              <span>الملاعب</span>
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              to="/tournaments"
              onClick={handleClose}
              className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 font-bold"
            >
              <Trophy className="size-3" />
              <span>البطولات</span>
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              to="/matches"
              onClick={handleClose}
              className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 font-bold"
            >
              <Shield className="size-3" />
              <span>المباريات</span>
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              to="/register-player"
              onClick={handleClose}
              className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-black"
            >
              <Phone className="size-3" />
              <span>سجّل كلاعب</span>
            </Link>
          </div>
        </div>
      )}

      {/* Floating Trigger Button: 56px circle with Genie image ONLY, no text inside or over button */}
      <div className="flex items-center gap-2">
        {!open && (
          <div className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#0F172A] border border-[#10B981]/60 px-3 py-1 text-xs font-bold text-white shadow-lg pointer-events-none animate-in fade-in slide-in-from-start-2">
            <span>الجني الذكي</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => (open ? handleClose() : handleOpen())}
          aria-label="الجني الذكي"
          title="الجني الذكي"
          className="relative flex size-14 items-center justify-center rounded-full bg-[#0F172A] border border-[#10B981] shadow-xl shadow-emerald-950/70 transition-all hover:scale-105 active:scale-95 cursor-pointer ring-2 ring-[#10B981]/30 p-0 overflow-visible"
        >
          <GenieMascot size={50} border={false} status={true} animated />
        </button>
      </div>
    </aside>
  )
}
