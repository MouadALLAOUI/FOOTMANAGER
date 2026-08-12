import React from 'react'

export default function Modal({ open, onClose, children, className = '' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-24">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className={`relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white ${className}`}>{children}</div>
    </div>
  )
}
