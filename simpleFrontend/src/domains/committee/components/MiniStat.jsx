import React from 'react'

export default function MiniStat({ label, value, tone = 'green' }) {
  const tones = {
    green: 'text-emerald-600',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
    sky: 'text-sky-600',
    violet: 'text-violet-600',
  }
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <span className="text-[10px] font-bold text-slate-500">{label}</span>
      <span className={`text-sm font-black tabular-nums ${tones[tone]}`}>{value}</span>
    </div>
  )
}
