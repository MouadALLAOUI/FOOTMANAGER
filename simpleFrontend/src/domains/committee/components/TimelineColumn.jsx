import React, { useMemo } from 'react'
import EventRow from './EventRow'
import { TeamAvatar } from '../../../pages/tournaments/shared'

export default function TimelineColumn({ team, events, freshKey, onEdit, onDelete, t, halfDuration }) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0) || (Number(a.added_time) || 0) - (Number(b.added_time) || 0)),
    [events],
  )

  return (
    <div className="min-w-0">
      {team && (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <TeamAvatar team={team.team} className="size-6" />
            <span className="truncate text-xs font-black text-slate-800">{team.name}</span>
          </div>
          <span className="text-base font-black tabular-nums text-slate-900">{team.score ?? 0}</span>
        </div>
      )}
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-1 py-6 text-center">
          <span className="text-slate-300">—</span>
          <p className="text-[11px] font-semibold text-slate-400">{t('committee.result.noTeamEvents')}</p>
        </div>
      ) : (
        <div className="xl:max-h-[42vh] xl:overflow-y-auto xl:pe-1">
          {sorted.map((ev, i) => (
            <EventRow key={ev._key} ev={ev} index={i} total={sorted.length} fresh={freshKey === ev._key} onEdit={() => onEdit(ev)} onDelete={() => onDelete(ev)} halfDuration={halfDuration} />
          ))}
        </div>
      )}
    </div>
  )
}
