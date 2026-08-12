import React from 'react'

export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-200 ${className}`}
      {...props}
    />
  )
}
