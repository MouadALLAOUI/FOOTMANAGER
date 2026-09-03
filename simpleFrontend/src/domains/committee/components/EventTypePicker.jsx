import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useScrollLock from '../../../components/useScrollLock'

export default function EventTypePicker({ open, options, onPick, onClose }) {
  const { t } = useTranslation()

  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const content = (
    <div className="grid grid-cols-2 gap-2.5 p-4 sm:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt.type}
          type="button"
          onClick={() => onPick(opt.type)}
          className={`flex min-h-[64px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-4 text-center text-xs font-black text-slate-700 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all active:scale-[0.97] ${
            opt.primary ? 'border-green-300 bg-green-50 text-green-700 ring-1 ring-green-200' : 'hover:border-green-300 hover:bg-green-50 hover:text-green-700'
          }`}
        >
          <span className="text-2xl leading-none">{opt.icon}</span>
          <span>{t(opt.labelKey)}</span>
        </button>
      ))}
    </div>
  )

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div className="fixed inset-0 z-[110] flex items-end sm:hidden">
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('committee.result.selectEventType')}
          className="pop-in relative flex max-h-[70dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-300" />
          <header className="flex items-center justify-between px-5 pb-2 pt-3">
            <h3 className="text-sm font-black text-slate-800">{t('committee.result.selectEventType')}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
            >
              ✕
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto">{content}</div>
        </div>
      </div>

      {/* Desktop: centered popover card */}
      <div className="fixed inset-0 z-[110] hidden items-center justify-center p-6 sm:flex">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('committee.result.selectEventType')}
          className="pop-in relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-sm font-black text-slate-800">{t('committee.result.selectEventType')}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              ✕
            </button>
          </header>
          {content}
        </div>
      </div>
    </>
  )
}