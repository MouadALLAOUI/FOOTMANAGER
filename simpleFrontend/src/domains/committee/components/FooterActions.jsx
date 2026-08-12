import React from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '../../../components/dashboard/ui'

export default function FooterActions({ saveError, retryRef, saving, saveDraft, setConfirmOpen, onClose, t }) {
  return (
    <footer className="shrink-0 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
      {saveError && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
          <span>{saveError}</span>
          <button type="button" onClick={() => retryRef.current?.()} disabled={saving} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-rose-500 px-2.5 py-1.5 text-[11px] font-black text-white transition-colors hover:bg-rose-600 disabled:opacity-50">
            <RefreshCw className="size-3.5" />
            {t('committee.result.retry')}
          </button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" loading={saving} onClick={saveDraft}>
            {t('committee.result.saveDraft')}
          </Button>
          <Button loading={saving} onClick={() => setConfirmOpen(true)}>
            {t('committee.result.finishMatch')}
          </Button>
        </div>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
      </div>
    </footer>
  )
}
