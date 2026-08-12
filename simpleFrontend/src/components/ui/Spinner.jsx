import React from 'react'

export default function Spinner({ className = '' }) {
  return <div className={`size-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-green-500 ${className}`} />
}
