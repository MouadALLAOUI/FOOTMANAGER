import React from 'react'

export default function Card({ children, className = '' }) {
  return <div className={`rounded-2xl border border-slate-100 bg-white p-4 ${className}`}>{children}</div>
}
