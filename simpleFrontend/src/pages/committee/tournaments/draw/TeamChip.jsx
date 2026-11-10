import { GripVertical } from 'lucide-react'
import { TeamAvatar } from '../../../tournaments/shared'
import { useProfileModal } from '../../../../components/profile/ProfileModalContext'

export default function TeamChip({ entry, onDragStart, locked, onClick }) {
  const { openTeam } = useProfileModal()

  return (
    <div
      draggable={!locked}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] shadow-2xs transition ${
        locked
          ? 'cursor-default opacity-80'
          : 'cursor-grab hover:border-[#B8F000] dark:hover:border-[#D0FF38] active:cursor-grabbing'
      }`}
    >
      {!locked && <GripVertical className="size-3.5 shrink-0 text-[#65706A] dark:text-[#B2B9B3]" />}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (entry?.team) openTeam(entry.team)
        }}
        className="shrink-0 cursor-pointer hover:opacity-80 active:scale-90 transition-transform"
        title="عرض معلومات الفريق"
      >
        <TeamAvatar team={entry.team} className="size-6 pointer-events-none" />
      </button>
      {entry?.team?.id != null ? <button type="button" draggable={false} onClick={(e) => { e.stopPropagation(); openTeam(entry.team) }} className="min-w-0 truncate text-start hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{entry.team.name}</button> : <span className="truncate">{entry.team?.name}</span>}
    </div>
  )
}
