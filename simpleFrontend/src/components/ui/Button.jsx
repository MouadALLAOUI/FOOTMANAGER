import React from 'react'

export default function Button({ children, className = '', variant = 'primary', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed select-none'
  const variants = {
    primary: 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] dark:text-[#101211] font-black hover:opacity-90 active:scale-[0.98]',
    secondary: 'bg-[#111313] dark:bg-[#252B27] text-[#F5F7F2] hover:bg-[#252B27] dark:hover:bg-[#303832] active:scale-[0.98]',
    outline: 'border border-[#E1E5DF] dark:border-[#303832] bg-transparent text-[#111313] dark:text-[#F5F7F2] hover:bg-[#E9ECE7] dark:hover:bg-[#252B27]',
    ghost: 'bg-transparent text-[#65706A] dark:text-[#B2B9B3] hover:bg-[#E9ECE7] dark:hover:bg-[#252B27] hover:text-[#111313] dark:hover:text-[#F5F7F2]',
    danger: 'bg-[#D93636] dark:bg-[#FF6868] text-white hover:opacity-90 active:scale-[0.98]',
  }

  return (
    <button className={`${base} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  )
}
