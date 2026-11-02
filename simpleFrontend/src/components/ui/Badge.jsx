import React from 'react'

export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-[#E9ECE7] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2]',
    lime: 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38] border border-[#B8F000]/40 dark:border-[#D0FF38]/30 font-black',
    success: 'bg-emerald-500/15 dark:bg-emerald-500/20 text-[#16834A] dark:text-[#42D889]',
    warning: 'bg-amber-500/15 dark:bg-amber-500/20 text-[#B87500] dark:text-[#FFC857]',
    danger: 'bg-rose-500/15 dark:bg-rose-500/20 text-[#D93636] dark:text-[#FF6868]',
    info: 'bg-sky-500/15 dark:bg-sky-500/20 text-[#2878C7] dark:text-[#65B5FF]',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold transition-colors ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  )
}
