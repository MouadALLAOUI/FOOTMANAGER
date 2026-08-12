import React from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'

export default function EventSub({ player, inOut }) {
  return (
    <p className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-slate-600">
      {inOut === 'out' ? <ArrowDown className="size-3 text-rose-400" /> : <ArrowUp className="size-3 text-emerald-500" />}
      <span className="truncate">{player}</span>
    </p>
  )
}
