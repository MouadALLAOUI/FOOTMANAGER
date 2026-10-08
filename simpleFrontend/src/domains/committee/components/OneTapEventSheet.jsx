import React, { useState } from 'react'
import {
  X,
  ArrowRight,
  Play,
  RotateCcw,
  Users,
  AlertCircle,
  Clock,
  Shield,
} from 'lucide-react'
import Jersey from '../../../pages/manager/live/components/Jersey'

/**
 * OneTapEventSheet:
 * Mobile-first compact bottom sheet for one-tap match event recording.
 *
 * Rules:
 * 1. 5 Big buttons: هدف · خطأ · تبديل · بطاقة صفراء · بطاقة حمراء
 * 2. ONE tap on (هدف / خطأ / صفراء / حمراء) records immediately without forms.
 * 3. Tapping "تبديل" shows the team's bench players; ONE tap performs substitution immediately.
 * 4. Guard: if match not started or timer paused, show clear message + start/resume action.
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

  if (!isOpen || !player) return null

  const photoSrc = player.photo_thumbnail_url || player.photo_url

  const handleAction = (type) => {
    if (matchNotStarted || isPaused) return
    if (type === 'substitution') {
      setView('bench')
      return
    }
    onRecordEvent(type, player, teamId)
    onClose()
  }

  const handleSelectBench = (benchPlayer) => {
    onSubstitute(player, benchPlayer, teamId)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-xs transition-opacity sm:items-center p-0 sm:p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar on mobile */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

        {/* Header: Player summary & Close */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {photoSrc ? (
              <div className="relative shrink-0">
                <img
                  src={photoSrc}
                  alt={player.name}
                  className="size-12 rounded-2xl object-cover ring-2 ring-white shadow-sm"
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
                className="h-11 w-10 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-900 truncate">{player.name}</h3>
              <p className="text-xs font-bold text-slate-500 truncate">
                {teamName} • الدقيقة {currentMinute}'
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
                  className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all"
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
                  className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all"
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
                        className="group flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 hover:bg-white hover:border-sky-400 hover:shadow-md active:scale-95 transition-all text-center select-none"
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
                        <span className="text-[10px] font-black text-sky-600 mt-0.5">
                          دخول ↵
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* View 1: 5 BIG Action Buttons (One-Tap) */
            <div className="space-y-2.5">
              {/* 1. GOAL (هدف) */}
              <button
                type="button"
                onClick={() => handleAction('goal')}
                className="w-full h-15 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-base flex items-center justify-between px-5 shadow-[0_4px_14px_rgba(16,185,129,0.35)] transition-all select-none"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl leading-none">⚽</span>
                  <span>هدف</span>
                </div>
                <span className="text-xs bg-emerald-700/80 px-2.5 py-1 rounded-xl font-bold">
                  تسجيل فوري
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 2. FOUL (خطأ) */}
                <button
                  type="button"
                  onClick={() => handleAction('foul')}
                  className="h-14 rounded-2xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm transition-all select-none"
                >
                  <span className="text-xl leading-none">🚦</span>
                  <span>خطأ</span>
                </button>

                {/* 3. SUBSTITUTION (تبديل) */}
                <button
                  type="button"
                  onClick={() => handleAction('substitution')}
                  className="h-14 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-sm transition-all select-none"
                >
                  <span className="text-xl leading-none">🔄</span>
                  <span>تبديل</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 4. YELLOW CARD (بطاقة صفراء) */}
                <button
                  type="button"
                  onClick={() => handleAction('yellow_card')}
                  className="h-14 rounded-2xl bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 text-amber-950 active:scale-98 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs transition-all select-none"
                >
                  <span className="text-xl leading-none">🟨</span>
                  <span>بطاقة صفراء</span>
                </button>

                {/* 5. RED CARD (بطاقة حمراء) */}
                <button
                  type="button"
                  onClick={() => handleAction('red_card')}
                  className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all select-none"
                >
                  <span className="text-xl leading-none">🟥</span>
                  <span>بطاقة حمراء</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
