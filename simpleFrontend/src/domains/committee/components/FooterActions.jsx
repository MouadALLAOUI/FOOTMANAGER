import { useState } from 'react'
import { Flag, Menu, Pause, Play, RefreshCw, StepForward, Clock } from 'lucide-react'
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
  t,
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  // Contextual primary action — the one correct button for the current state.
  let primary = null
  if (alreadyFinished) {
    primary = { key: 'finish', icon: null, label: t('committee.result.finishMatch'), action: () => setConfirmOpen(true), variant: null }
  } else if (matchNotStarted) {
    primary = { key: 'start', icon: <Play className="size-4" />, label: t('committee.result.runMatch'), action: runMatch, variant: null }
  } else if (isLiveMatch) {
    if (showHalftime) primary = { key: 'half', icon: <Flag className="size-4" />, label: t('committee.result.toHalftime'), action: onHalftime, variant: 'outline' }
    else if (showStartSecondHalf) primary = { key: 'second', icon: <StepForward className="size-4" />, label: t('committee.result.startSecondHalf'), action: onStartSecondHalf, variant: null }
    else if (canFinishMatch) primary = { key: 'finish', icon: null, label: t('committee.result.finishMatch'), action: () => setConfirmOpen(true), variant: null }
    else primary = { key: 'post', icon: null, label: t('committee.result.postCurrentResult'), action: postCurrentResult, variant: null }
  }

  return (
    <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
      {saveError && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
          <span className="min-w-0">{saveError}</span>
          <button type="button" onClick={() => retryRef.current?.()} disabled={saving} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-rose-600 disabled:opacity-50">
            <RefreshCw className="size-3.5" />
            {t('committee.result.retry')}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* Timer Clock Badge at bottom */}
        {isLiveMatch && timerText && (
          <div className={`flex items-center gap-1.5 px-3 h-12 rounded-xl border text-xs font-mono font-black tabular-nums transition-colors ${
            isPaused ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-900 border-slate-900 text-white'
          }`}>
            <Clock className={`size-3.5 ${!isPaused ? 'animate-pulse text-emerald-400' : ''}`} />
            <span>{timerText}</span>
          </div>
        )}

        {/* Pause / Resume Button */}
        {isLiveMatch && !alreadyFinished && onTogglePause && (
          <button
            type="button"
            onClick={onTogglePause}
            className={`h-12 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all select-none shadow-xs active:scale-95 ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
            }`}
            title={isPaused ? 'استئناف المؤقت' : 'إيقاف مؤقت'}
          >
            {isPaused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
            <span className="hidden sm:inline">{isPaused ? 'استئناف' : 'إيقاف مؤقت'}</span>
          </button>
        )}

        {primary ? (
          <Button
            className="h-12 flex-1 min-w-0 text-sm"
            variant={primary.variant}
            loading={saving}
            onClick={primary.action}
          >
            {primary.icon}
            {primary.label}
          </Button>
        ) : (
          <Button className="h-12 flex-1 min-w-0 text-sm" variant="outline" loading={saving} onClick={saveDraft}>
            {t('committee.result.saveDraft')}
          </Button>
        )}

        {/* Finish match button appears ONLY when finished or allowed at end of second half */}
        {!alreadyFinished && canFinishMatch && onQuickFinish && (
          <Button className="h-12 shrink-0 text-sm font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-2 ring-emerald-500/20" loading={saving} onClick={onQuickFinish}>
            {t('committee.result.finishMatch')}
          </Button>
        )}

        {/* Overflow menu for secondary actions */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={t('committee.result.moreActions')}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="grid size-12 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600 transition-colors hover:border-slate-300 hover:bg-white"
          >
            <Menu className="size-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute bottom-full end-0 z-50 mb-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
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
                {!(matchNotStarted || isLiveMatch || alreadyFinished) && (
                  <MenuItem danger label={t('common.cancel')} onClick={() => { setMenuOpen(false); onClose() }} />
                )}
              </div>
            </>
          )}
        </div>
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