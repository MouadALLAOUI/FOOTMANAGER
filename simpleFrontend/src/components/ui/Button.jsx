import React from 'react'

export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md px-4 py-2 font-semibold transition'
  const variants = {
    primary: 'bg-green-500 text-white hover:bg-green-600',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-50',
    danger: 'bg-rose-500 text-white hover:bg-rose-600',
  }

  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  )
}
