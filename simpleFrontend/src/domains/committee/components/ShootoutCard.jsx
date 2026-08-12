import React from 'react'
import { Trophy, Minus, Plus } from 'lucide-react'
import SectionCard from '../../../components/ui/SectionCard'
import { TeamAvatar } from '../../../pages/tournaments/shared'

function PenRow({ name, team, count, setCount }) {
  const bump = (delta) => setCount((v) => Math.max(0, Math.min(20, (Number(v) || 0) + delta)))
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <TeamAvatar team={team} className="size-7" />
        <span className="truncate text-xs font-bold text-slate-700">{name}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => bump(-1)} className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200" aria-label="-" >
          <Minus className="size-3.5" />
        </button>
        <span className="min-w-6 text-center text-base font-black tabular-nums text-slate-900">{count}</span>
        <button type="button" onClick={() => bump(1)} className="grid size-7 place-items-center rounded-lg bg-green-50 text-green-600 transition-colors hover:bg-green-100" aria-label="+" >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function ShootoutCard({ homeName, awayName, homePen, awayPen, setHomePen, setAwayPen, homeTeam, awayTeam, t }) {
  const h = Number(homePen) || 0
  const a = Number(awayPen) || 0
  const penMark = (count) => Array.from({ length: Math.max(count, 0) }).map(() => '✓')
  return (
    <SectionCard title={t('committee.result.shootout')} icon={Trophy}>
      <p className="mb-3 text-[11px] font-semibold text-slate-400">{t('committee.result.shootoutDesc')}</p>
      <div className="space-y-2">
        <PenRow name={homeName} team={homeTeam} count={h} setCount={setHomePen} />
        <PenRow name={awayName} team={awayTeam} count={a} setCount={setAwayPen} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          {penMark(h).map((m, i) => <span key={i} className="text-xs font-black text-emerald-600">{m}</span>)}
        </div>
        <span className="text-xs font-black tabular-nums text-slate-700">{h} - {a}</span>
        <div className="flex items-center gap-1.5">
          {penMark(a).map((m, i) => <span key={i} className="text-xs font-black text-emerald-600">{m}</span>)}
        </div>
      </div>
    </SectionCard>
  )
}
