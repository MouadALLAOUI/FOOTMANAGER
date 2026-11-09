import { CheckCircle2, Users } from 'lucide-react'
import TeamChip from './TeamChip'

export default function TeamPool({ title, hint, allDrawnText, entries, onDragStart, onDrop, locked, onSelectTeam }) {
  return (
    <div
      onDragOver={(e) => !locked && e.preventDefault()}
      onDrop={onDrop}
      className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#D0FF38]">
            <Users className="size-4" />
          </span>
          <div>
            <p className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">{title}</p>
            <p className="text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">{hint}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 px-2.5 py-0.5 text-xs font-black text-[#111313] dark:text-[#D0FF38]">
          {entries.length}
        </span>
      </div>
      {entries.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#1F9D55]/40 bg-[#1F9D55]/10 py-5 text-xs font-bold text-[#1F9D55] dark:text-[#30D158]">
          <CheckCircle2 className="size-4" />
          {allDrawnText}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entries.map((entry) => (
            <TeamChip
              key={entry.team.id}
              entry={entry}
              onDragStart={onDragStart(entry.team.id)}
              locked={locked}
              onClick={() => !locked && onSelectTeam?.(entry)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
