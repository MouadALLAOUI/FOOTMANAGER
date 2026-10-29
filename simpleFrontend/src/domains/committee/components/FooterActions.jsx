import { useState } from 'react'
import { Flag, Menu, Pause, Play, RefreshCw, StepForward, Clock, Sparkles, LogOut } from 'lucide-react'
import { Button } from '../../../components/dashboard/ui'

export default function FooterActions({
  saveError,
  retryRef,
  saving,
  saveDraft,
  setConfirmOpen,
  onClose,
  matchNotStarted,
  isLiveMatch,
  alreadyFinished,
  runMatch,
  postCurrentResult,
  showHalftime,
  showStartSecondHalf,
  onHalftime,
  onStartSecondHalf,
  onQuickFinish,
  isPaused = false,
  onTogglePause,
  timerText = null,
  canFinishMatch = false,
  hasDisciplinedTeam = false,
  isDefaultResult = false,
  onAwardDefaultPoints = null,
  applyingDefaultPoints = false,
  opponentTeamName = '',
  t,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Contextual primary action — the one correct button for the current state.
  let primary = null
  if (hasDisciplinedTeam && !isDefaultResult && !alreadyFinished && onAwardDefaultPoints) {
    primary = {
      key: 'award_default',
      icon: <Sparkles className="size-4 text-amber-200" />,
      label: `إعطاء 3 نقاط اعتبارية لـ ${opponentTeamName || 'الخصم'}`,
      action: onAwardDefaultPoints,
      variant: 'amber',
    }
  } else if (alreadyFinished) {
    primary = { key: 'finish', icon: null, label: t('committee.result.saveForceChanges', 'حفظ وفرض التعديلات'), action: () => setConfirmOpen(true), variant: 'danger' }
  } else if (matchNotStarted) {
    primary = { key: 'start', icon: <Play className="size-4" />, label: t('committee.result.runMatch'), action: runMatch, variant: null }
  } else if (isLiveMatch) {
    if (showHalftime) primary = { key: 'half', icon: <Flag className="size-4" />, label: t('committee.result.toHalftime'), action: onHalftime, variant: 'outline' }
    else if (showStartSecondHalf) primary = { key: 'second', icon: <StepForward className="size-4" />, label: t('committee.result.startSecondHalf'), action: onStartSecondHalf, variant: null }
    else if (canFinishMatch) primary = { key: 'finish', icon: null, label: t('committee.result.finishMatch'), action: () => setConfirmOpen(true), variant: null }
    else primary = { key: 'post', icon: null, label: t('committee.result.postCurrentResult'), action: postCurrentResult, variant: null }
  }

  return (
    <footer className="shrink-0 border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-3 sm:px-5 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {saveError && (
        <div className="mb-2.5 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
          <span className="min-w-0">{saveError}</span>
          <button type="button" onClick={() => retryRef.current?.()} disabled={saving} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-500 px-2.5 py-1 text-[11px] font-black text-white transition-colors hover:bg-rose-600 disabled:opacity-50">
            <RefreshCw className="size-3.5" />
            {t('committee.result.retry')}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 max-w-5xl mx-auto">
        {/* 1. Menu hamburger button */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={t('committee.result.moreActions')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="grid size-12 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-slate-300 hover:bg-white active:scale-95 shadow-xs"
          >
            <Menu className="size-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute bottom-full start-0 z-50 mb-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                {hasDisciplinedTeam && !isDefaultResult && !alreadyFinished && onAwardDefaultPoints && (
                  <MenuItem
                    icon={<Sparkles className="size-4 text-amber-500" />}
                    label={`إعطاء 3 نقاط لـ ${opponentTeamName || 'الخصم'}`}
                    onClick={() => { setMenuOpen(false); onAwardDefaultPoints() }}
                  />
                )}
                {!alreadyFinished && (
                  <MenuItem label={t('committee.result.saveDraft')} onClick={() => { setMenuOpen(false); saveDraft() }} />
                )}
                {matchNotStarted && !alreadyFinished && (
                  <MenuItem icon={<Play className="size-4" />} label={t('committee.result.runMatch')} onClick={() => { setMenuOpen(false); runMatch() }} />
                )}
                {isLiveMatch && !alreadyFinished && showHalftime && (
                  <MenuItem icon={<Flag className="size-4" />} label={t('committee.result.toHalftime')} onClick={() => { setMenuOpen(false); onHalftime() }} />
                )}
                {isLiveMatch && !alreadyFinished && showStartSecondHalf && (
                  <MenuItem icon={<StepForward className="size-4" />} label={t('committee.result.startSecondHalf')} onClick={() => { setMenuOpen(false); onStartSecondHalf() }} />
                )}
                {isLiveMatch && !alreadyFinished && (
                  <MenuItem label={t('committee.result.postCurrentResult')} onClick={() => { setMenuOpen(false); postCurrentResult() }} />
                )}
                {!alreadyFinished && (
                  <MenuItem label={t('committee.result.finishMatch')} onClick={() => { setMenuOpen(false); setConfirmOpen(true) }} />
                )}
                <MenuItem
                  danger
                  icon={<LogOut className="size-4 text-rose-500 rotate-180" />}
                  label="خروج مؤقت من المباراة"
                  onClick={() => { setMenuOpen(false); onClose() }}
                />
              </div>
            </>
          )}
        </div>

        {/* 2. Main Action Stage Button */}
        {primary ? (
          <button
            type="button"
            disabled={saving}
            onClick={primary.action}
            className={`h-12 flex-1 min-w-0 rounded-2xl px-4 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md ${
              primary.variant === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25'
                : primary.variant === 'amber'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25'
                  : primary.variant === 'outline'
                    ? 'border-2 border-emerald-600 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100'
                    : 'bg-gradient-to-r from-[#00C853] to-[#009E3D] hover:from-[#00B84D] hover:to-[#008A35] text-white shadow-emerald-500/25'
            }`}
          >
            {primary.icon}
            <span className="truncate">{primary.label}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={saveDraft}
            className="h-12 flex-1 min-w-0 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-98 shadow-xs"
          >
            <span>{t('committee.result.saveDraft')}</span>
          </button>
        )}

        {/* 3. Dedicated Temporary Exit Button - Always visible and accessible */}
        <button
          type="button"
          onClick={onClose}
          className="h-12 shrink-0 px-3 sm:px-4 rounded-2xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95 transition-all flex items-center justify-center gap-1.5 text-xs sm:text-sm font-black shadow-xs cursor-pointer select-none"
          title="خروج مؤقت من نافذة المباراة"
        >
          <LogOut className="size-4 text-slate-600 rotate-180" />
          <span className="whitespace-nowrap">خروج مؤقت</span>
        </button>

        {/* Finish match extra shortcut if allowed */}
        {!alreadyFinished && canFinishMatch && onQuickFinish && (
          <button
            type="button"
            disabled={saving}
            onClick={onQuickFinish}
            className="h-12 shrink-0 px-3.5 rounded-2xl text-xs sm:text-sm font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md active:scale-98 transition-all"
          >
            <span>{t('committee.result.finishMatch')}</span>
          </button>
        )}

        {/* 3. Orange Pause / Resume Button */}
        {isLiveMatch && !alreadyFinished && onTogglePause && (
          <button
            type="button"
            onClick={onTogglePause}
            className={`size-12 rounded-2xl font-black text-xs flex items-center justify-center shrink-0 transition-all select-none shadow-md active:scale-95 ${
              isPaused
                ? 'bg-[#00C853] hover:bg-[#00B048] text-white shadow-emerald-500/25'
                : 'bg-[#FF9100] hover:bg-[#E68200] text-white shadow-amber-500/25'
            }`}
            title={isPaused ? 'استئناف المؤقت' : 'إيقاف مؤقت'}
          >
            {isPaused ? <Play className="size-5 fill-current" /> : <Pause className="size-5 fill-current" />}
          </button>
        )}

        {/* 4. Navy Timer Pill */}
        {isLiveMatch && timerText && (
          <div
            className={`flex items-center gap-1.5 px-3 h-12 rounded-2xl border text-xs font-mono font-black tabular-nums shrink-0 transition-colors shadow-xs ${
              isPaused
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-[#10213A] border-[#10213A] text-white'
            }`}
          >
            <Clock className={`size-3.5 ${!isPaused ? 'animate-pulse text-[#00C853]' : 'text-amber-500'}`} />
            <span>{timerText}</span>
          </div>
        )}
      </div>
    </footer>
  )
}

function MenuItem({ icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-start text-xs font-black transition-colors ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}`}
    >
      {icon}
      <span className="flex-1">{label}</span>
    </button>
  )
}
