import React, { useState } from 'react'
import {
  X,
  ArrowRight,
  Play,
  Users,
  Clock,
  FileText,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import Jersey from '../../../pages/manager/live/components/Jersey'

/**
 * OneTapEventSheet:
 * Mobile-first centered modal matching the visual target for fast event recording.
 *
 * Rules:
 * 1. 6 Big action tiles (3x2 grid): هدف · بطاقة صفراء · بطاقة حمراء · خطأ · تبديل · أخرى
 * 2. ONE tap on (هدف / بطاقة / خطأ) records immediately using current match minute without extra forms.
 * 3. Tapping "تبديل" shows the team's bench players; ONE tap performs substitution immediately.
 * 4. Guards for unstarted or paused matches.
 * 5. Optional note input.
 */
export default function OneTapEventSheet({
  isOpen,
  onClose,
  player,
  teamId,
  teamName,
  teamVariant = 'home',
  benchPlayers = [],
  matchNotStarted = false,
  isPaused = false,
  onRecordEvent,
  onSubstitute,
  onStartMatch,
  onResumeTimer,
  currentMinute = 1,
}) {
  const [view, setView] = useState('main') // 'main' | 'bench'
  const [note, setNote] = useState('')

  if (!isOpen || !player) return null

  const photoSrc = player.photo_thumbnail_url || player.photo_url

  const handleAction = (type) => {
    if (matchNotStarted || isPaused) return
    if (type === 'substitution') {
      setView('bench')
      return
    }
    onRecordEvent(type, player, teamId, note)
    setNote('')
    onClose()
  }

  const handleSelectBench = (benchPlayer) => {
    onSubstitute(player, benchPlayer, teamId)
    setNote('')
    setView('main')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 transition-all"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Player Photo, Name, and Close Button */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {photoSrc ? (
              <div className="relative shrink-0">
                <img
                  src={photoSrc}
                  alt={player.name}
                  className="size-13 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                />
                {player.number != null && (
                  <span className="absolute -bottom-1 -end-1 size-5 rounded-full bg-slate-900 text-white text-[10px] font-black grid place-items-center shadow">
                    {player.number}
                  </span>
                )}
              </div>
            ) : (
              <Jersey
                number={player.number}
                variant={teamVariant}
                className="h-12 w-11 shrink-0"
              />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 truncate">{player.name}</h3>
                {player.number != null && (
                  <span className="text-xs font-black text-slate-400">#{player.number}</span>
                )}
              </div>
              <p className="text-xs font-bold text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                <span>{teamName}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-black">
                  <Clock className="size-3" />
                  الدقيقة {currentMinute}'
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-xl grid place-items-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors shrink-0"
            aria-label="إغلاق"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto">
          {/* GUARD 1: Match not started */}
          {matchNotStarted ? (
            <div className="py-6 px-4 text-center flex flex-col items-center">
              <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 grid place-items-center mb-3">
                <Clock className="size-7" />
              </div>
              <h4 className="text-base font-black text-slate-900 mb-1">المباراة لم تبدأ بعد</h4>
              <p className="text-xs font-bold text-slate-500 mb-5 max-w-xs">
                يجب بدء المباراة لتشغيل المؤقت قبل تسجيل أي أحداث.
              </p>
              {onStartMatch && (
                <button
                  type="button"
                  onClick={() => {
                    onStartMatch()
                    onClose()
                  }}
                  className="w-full h-12 rounded-2xl bg-[#00C853] hover:bg-[#00B048] active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Play className="size-5 fill-current" />
                  <span>ابدأ المباراة أولاً</span>
                </button>
              )}
            </div>
          ) : isPaused ? (
            /* GUARD 2: Timer paused */
            <div className="py-6 px-4 text-center flex flex-col items-center">
              <div className="size-14 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 grid place-items-center mb-3">
                <Clock className="size-7 animate-pulse" />
              </div>
              <h4 className="text-base font-black text-slate-900 mb-1">المؤقت متوقف مؤقتاً</h4>
              <p className="text-xs font-bold text-slate-500 mb-5 max-w-xs">
                المؤقت متوقف لتفادي تسجيل دقيقة غير دقيقة أثناء التوقف.
              </p>
              {onResumeTimer && (
                <button
                  type="button"
                  onClick={() => {
                    onResumeTimer()
                    onClose()
                  }}
                  className="w-full h-12 rounded-2xl bg-[#00C853] hover:bg-[#00B048] active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Play className="size-5 fill-current" />
                  <span>استئناف المؤقت للمتابعة</span>
                </button>
              )}
            </div>
          ) : view === 'bench' ? (
            /* View 2: Bench Selection for Substitution */
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-slate-900">اختر اللاعب البديل</span>
                  <span className="text-xs font-bold text-slate-400">({benchPlayers.length} بالدكة)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setView('main')}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  <ArrowRight className="size-3.5" />
                  <span>رجوع</span>
                </button>
              </div>

              {benchPlayers.length === 0 ? (
                <div className="py-8 text-center text-slate-400 flex flex-col items-center">
                  <Users className="size-10 mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">لا يوجد لاعبون في دكة الاحتياط</p>
                  <p className="text-xs font-medium text-slate-400 mt-1">
                    جميع لاعبي الفريق المؤهلين متواجدون حالياً في أرضية الملعب.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto p-1">
                  {benchPlayers.map((bp) => {
                    const bpPhoto = bp.photo_thumbnail_url || bp.photo_url
                    return (
                      <button
                        key={bp.id}
                        type="button"
                        onClick={() => handleSelectBench(bp)}
                        className="group flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-[#8A2BE2] hover:shadow-md active:scale-95 transition-all text-center select-none"
                      >
                        <div className="relative my-1">
                          {bpPhoto ? (
                            <img
                              src={bpPhoto}
                              alt={bp.name}
                              className="size-12 rounded-2xl object-cover ring-2 ring-white shadow-xs"
                            />
                          ) : (
                            <Jersey
                              number={bp.number}
                              variant={teamVariant}
                              className="h-11 w-10"
                            />
                          )}
                          {bp.number != null && bpPhoto && (
                            <span className="absolute -bottom-1 -end-1 size-4 rounded-full bg-slate-900 text-white text-[9px] font-black grid place-items-center shadow">
                              {bp.number}
                            </span>
                          )}
                        </div>
                        <span className="mt-1 text-xs font-bold text-slate-800 truncate w-full">
                          {bp.name}
                        </span>
                        <span className="text-[10px] font-black text-[#8A2BE2] mt-0.5">
                          دخول ↵
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* View 1: 6 Big Action Tiles in 3x2 Grid */
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* 1. GOAL (هدف) - Green #00C853 */}
                <button
                  type="button"
                  onClick={() => handleAction('goal')}
                  className="h-20 rounded-2xl bg-gradient-to-br from-[#00C853] to-[#00A844] hover:from-[#00B84D] hover:to-[#00943C] active:scale-96 text-white font-black flex flex-col items-center justify-center gap-1 shadow-md shadow-emerald-500/25 transition-all select-none group"
                >
                  <span className="text-2xl leading-none transition-transform group-hover:scale-110">⚽</span>
                  <span className="text-xs sm:text-sm">هدف</span>
                </button>

                {/* 2. YELLOW CARD (بطاقة صفراء) - Amber #FFC400 */}
                <button
                  type="button"
                  onClick={() => handleAction('yellow_card')}
                  className="h-20 rounded-2xl bg-gradient-to-br from-[#FFD54F] to-[#FFB300] hover:from-[#FFE082] hover:to-[#FFA000] active:scale-96 text-amber-950 font-black flex flex-col items-center justify-center gap-1 shadow-md shadow-amber-500/20 transition-all select-none group"
                >
                  <span className="text-2xl leading-none transition-transform group-hover:scale-110">🟨</span>
                  <span className="text-xs sm:text-sm">بطاقة صفراء</span>
                </button>

                {/* 3. RED CARD (بطاقة حمراء) - Red #FF1744 */}
                <button
                  type="button"
                  onClick={() => handleAction('red_card')}
                  className="h-20 rounded-2xl bg-gradient-to-br from-[#FF1744] to-[#D50000] hover:from-[#FF4569] hover:to-[#C50000] active:scale-96 text-white font-black flex flex-col items-center justify-center gap-1 shadow-md shadow-rose-500/25 transition-all select-none group"
                >
                  <span className="text-2xl leading-none transition-transform group-hover:scale-110">🟥</span>
                  <span className="text-xs sm:text-sm">بطاقة حمراء</span>
                </button>

                {/* 4. FOUL (خطأ) - Blue #087FFF */}
                <button
                  type="button"
                  onClick={() => handleAction('foul')}
                  className="h-20 rounded-2xl bg-gradient-to-br from-[#087FFF] to-[#0066D6] hover:from-[#2190FF] hover:to-[#0052B3] active:scale-96 text-white font-black flex flex-col items-center justify-center gap-1 shadow-md shadow-blue-500/25 transition-all select-none group"
                >
                  <span className="text-2xl leading-none transition-transform group-hover:scale-110">⚠️</span>
                  <span className="text-xs sm:text-sm">خطأ</span>
                </button>

                {/* 5. SUBSTITUTION (تبديل) - Purple #8A2BE2 */}
                <button
                  type="button"
                  onClick={() => handleAction('substitution')}
                  className="h-20 rounded-2xl bg-gradient-to-br from-[#8A2BE2] to-[#701ED1] hover:from-[#9D44EB] hover:to-[#5E14B8] active:scale-96 text-white font-black flex flex-col items-center justify-center gap-1 shadow-md shadow-purple-500/25 transition-all select-none group"
                >
                  <span className="text-2xl leading-none transition-transform group-hover:scale-110">🔄</span>
                  <span className="text-xs sm:text-sm">تبديل</span>
                </button>

                {/* 6. OTHER / NOTE (أخرى) - Slate #64748B */}
                <button
                  type="button"
                  onClick={() => handleAction('other')}
                  className="h-20 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 active:scale-96 text-white font-black flex flex-col items-center justify-center gap-1 shadow-md shadow-slate-600/20 transition-all select-none group"
                >
                  <span className="text-2xl leading-none transition-transform group-hover:scale-110">📝</span>
                  <span className="text-xs sm:text-sm">أخرى</span>
                </button>
              </div>

              {/* Optional Note Field */}
              <div className="pt-1">
                <div className="relative">
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="أضف ملاحظة (اختياري)..."
                    className="w-full h-11 pe-9 ps-3.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  />
                  <FileText className="size-4 text-slate-400 absolute end-3 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
