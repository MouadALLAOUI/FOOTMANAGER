import React from 'react'
import {
  Play,
  Pause,
  Clock,
  Send,
  Flag,
  StepForward,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '../../../components/dashboard/ui'

/**
 * MatchTimerBottomBar:
 * Floating bottom bar providing:
 * - Current time display & Pause / Resume toggle (breaks, stoppages).
 * - Keep existing start-of-match and end-of-half controls.
 * - Submit result button ("إرسال النتيجة للاعتماد") appears ONLY at the end of the second half (or when finished).
 * - Distinct visual style from event buttons.
 * - Auto-save / sync status indicator.
 */
export default function MatchTimerBottomBar({
  curStatus = 'scheduled',
  isPaused = false,
  timerText = null,
  liveMinute = 0,
  activeHalf = null,
  syncStatus = 'idle', // 'idle' | 'saving' | 'saved' | 'error'
  isFinished = false,
  secondHalfEnded = false,
  onTogglePause,
  onStartMatch,
  onHalftime,
  onStartSecondHalf,
  onFinishSecondHalf,
  onSubmitResult,
  scoreText = '',
  loading = false,
  t,
}) {
  const matchNotStarted = curStatus === 'scheduled' || curStatus === 'warmup'
  const isHalftime = curStatus === 'halftime'
  const isFirstHalf = curStatus === 'first_half'
  const isSecondHalf = curStatus === 'second_half'
  const canSubmit = isFinished || secondHalfEnded || curStatus === 'finished'

  return (
    <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/90 bg-white/95 px-3 py-2.5 sm:px-5 sm:py-3 backdrop-blur-md shadow-[0_-4px_20px_rgba(15,23,42,0.08)]" dir="rtl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2.5">
        {/* Left: Timer Display & Pause/Resume Button */}
        <div className="flex items-center gap-2">
          {/* Timer Clock Badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-colors ${
            isPaused
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : matchNotStarted
                ? 'bg-slate-100 border-slate-200 text-slate-500'
                : 'bg-slate-900 border-slate-900 text-white'
          }`}>
            <Clock className={`size-4 ${!isPaused && activeHalf ? 'animate-pulse text-emerald-400' : ''}`} />
            <div className="flex flex-col">
              <span className="font-mono text-xs sm:text-sm font-black tabular-nums leading-tight">
                {timerText || (liveMinute > 0 ? `${liveMinute}'` : '00:00')}
              </span>
              <span className="text-[9px] font-bold opacity-75 leading-none">
                {isPaused
                  ? 'متوقف'
                  : matchNotStarted
                    ? 'لم تبدأ'
                    : activeHalf === 'second'
                      ? 'الشوط 2'
                      : isHalftime
                        ? 'استراحة'
                        : 'الشوط 1'}
              </span>
            </div>
          </div>

          {/* Pause / Resume Button (Active during play) */}
          {(isFirstHalf || isSecondHalf) && !isFinished && onTogglePause && (
            <button
              type="button"
              onClick={onTogglePause}
              className={`h-11 px-3 sm:px-3.5 rounded-2xl font-black text-xs flex items-center gap-1.5 transition-all select-none shadow-xs active:scale-95 ${
                isPaused
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
              }`}
              title={isPaused ? 'استئناف المؤقت' : 'إيقاف مؤقت'}
            >
              {isPaused ? (
                <>
                  <Play className="size-4 fill-current" />
                  <span className="hidden xs:inline">استئناف</span>
                </>
              ) : (
                <>
                  <Pause className="size-4 fill-current" />
                  <span className="hidden xs:inline">إيقاف مؤقت</span>
                </>
              )}
            </button>
          )}

          {/* Auto-save sync indicator */}
          {syncStatus === 'saving' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
              <Loader2 className="size-3 animate-spin text-slate-400" />
              <span>جارٍ الحفظ...</span>
            </span>
          )}
          {syncStatus === 'saved' && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 animate-in fade-in">
              <CheckCircle2 className="size-3" />
              <span>تم الحفظ</span>
            </span>
          )}
        </div>

        {/* Right / Center: Action Controls */}
        <div className="flex items-center gap-2 flex-1 justify-end max-w-sm sm:max-w-md">
          {/* State 1: Match not started */}
          {matchNotStarted && onStartMatch && (
            <button
              type="button"
              onClick={onStartMatch}
              disabled={loading}
              className="h-11 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Play className="size-4 fill-current" />
              <span>بدء المباراة</span>
            </button>
          )}

          {/* State 2: End First Half (To Halftime) */}
          {isFirstHalf && onHalftime && (
            <button
              type="button"
              onClick={onHalftime}
              disabled={loading}
              className="h-11 flex-1 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-98 text-slate-800 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <Flag className="size-4 text-amber-600" />
              <span>استراحة الشوطين</span>
            </button>
          )}

          {/* State 3: Start Second Half */}
          {isHalftime && onStartSecondHalf && (
            <button
              type="button"
              onClick={onStartSecondHalf}
              disabled={loading}
              className="h-11 flex-1 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <StepForward className="size-4" />
              <span>بدء الشوط الثاني</span>
            </button>
          )}

          {/* State 3.5: Finish Second Half (Full Time) */}
          {isSecondHalf && !canSubmit && onFinishSecondHalf && (
            <button
              type="button"
              onClick={onFinishSecondHalf}
              disabled={loading}
              className="h-11 flex-1 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-98 text-slate-800 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs transition-all"
            >
              <Flag className="size-4 text-emerald-600" />
              <span>إنهاء المباراة</span>
            </button>
          )}

          {/* State 4: Submit Result Button — ONLY visible at end of second half / full-time */}
          {canSubmit && onSubmitResult && (
            <button
              type="button"
              onClick={onSubmitResult}
              disabled={loading}
              className="h-12 flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500/20 transition-all select-none"
            >
              <Send className="size-4" />
              <span className="truncate">
                إرسال النتيجة للاعتماد {scoreText ? `(${scoreText})` : ''}
              </span>
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}
