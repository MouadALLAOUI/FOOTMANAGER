import { GripVertical } from 'lucide-react'
import { TeamAvatar } from '../../../tournaments/shared'
import { chipClass } from './drawLogic'

export default function TeamChip({ team, busy, showGrip, onDragStart, onDragOver, onDrop }) {
  return (
    <div
      draggable={showGrip && !busy}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={chipClass(busy)}
    >
      <TeamAvatar team={team} className="size-7" />
      <span className="truncate text-xs font-bold text-slate-700">{team?.name || '-'}</span>
      {showGrip && <GripVertical className="ms-auto size-4 shrink-0 text-slate-300" />}
    </div>
  )
}
