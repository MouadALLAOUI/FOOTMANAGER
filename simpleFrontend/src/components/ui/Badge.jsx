import React from 'react'

export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700',
    success: 'inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-bold text-green-700',
    danger: 'inline-flex items-center rounded-full bg-rose-100 px-2 py-1 text-xs font-bold text-rose-700',
  }
  return <span className={`${variants[variant] || variants.default} ${className}`}>{children}</span>
}
