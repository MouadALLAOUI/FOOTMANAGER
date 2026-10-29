import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'

export default function ModalShell({ children, onClose }) {
  const { t } = useTranslation()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="overlay-in fixed inset-0 z-[var(--z-overlay)] bg-slate-900/60 backdrop-blur-xs" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('committee.result.title')}
        className="pop-in relative z-[var(--z-modal)] flex h-[100dvh] max-h-[100dvh] pt-[max(env(safe-area-inset-top),8px)] sm:pt-0 w-full max-w-[1150px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:h-auto sm:max-h-[94vh] sm:rounded-[24px] sm:ring-1 sm:ring-slate-900/5"
      >
        {/* Floating Quick Exit Pill on Mobile */}
        <button
          type="button"
          onClick={onClose}
          aria-label="خروج مؤقت"
          className="sm:hidden absolute top-2 start-3 z-10 flex items-center gap-1.5 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white px-3 py-1 text-xs font-black shadow-lg backdrop-blur-md active:scale-95 transition-all cursor-pointer border border-white/20"
        >
          <LogOut className="size-3.5 text-amber-300 rotate-180" />
          <span>خروج مؤقت</span>
        </button>

        {children}
      </div>
    </div>,
    document.body,
  )
}
