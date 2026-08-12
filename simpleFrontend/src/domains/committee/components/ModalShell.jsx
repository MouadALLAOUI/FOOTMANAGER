import React from 'react'
import { useTranslation } from 'react-i18next'

export default function ModalShell({ children, onClose }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="overlay-in absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('committee.result.title')}
        className="pop-in relative flex max-h-[100dvh] w-full max-w-[1150px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none sm:max-h-[94vh] sm:rounded-[24px] sm:ring-1 sm:ring-slate-900/5"
      >
        {children}
      </div>
    </div>
  )
}
