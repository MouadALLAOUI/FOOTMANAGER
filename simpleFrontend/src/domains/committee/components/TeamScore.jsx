import React from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { TeamAvatar } from '../../../pages/tournaments/shared'

export default function TeamScore({ side, team, name }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <TeamAvatar team={team} className="size-12" />
      <div className="flex max-w-full items-center gap-1.5">
        <span className="truncate text-sm font-bold text-slate-800 sm:text-base">{name}</span>
        {side === 'home' ? <ArrowDown className="size-4 shrink-0 text-slate-300" /> : <ArrowUp className="size-4 shrink-0 text-slate-300" />}
      </div>
    </div>
  )
}
