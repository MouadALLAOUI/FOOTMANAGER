import React from 'react'

export default function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2] p-4 sm:p-5 shadow-xs transition-colors ${className}`}>
      {children}
    </div>
  )
}
