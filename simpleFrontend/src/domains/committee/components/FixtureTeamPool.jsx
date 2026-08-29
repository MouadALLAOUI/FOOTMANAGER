import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, GripVertical } from 'lucide-react'
import { Badge } from '../../../components/dashboard/ui'
import { TeamAvatar } from '../../../pages/tournaments/shared'

export default function FixtureTeamPool({ title, teams = [], usedIds = null, busy, onDragStart, hint }) {
  const { t } = useTranslation()

  const used = usedIds instanceof Set ? usedIds : new Set(usedIds || [])
  const visible = used.size ? teams.filter((team) => !used.has(team.id)) : teams
  const anyHidden = visible.length !== teams.length

  const sections = useMemo(() => {
    const map = new Map()
    for (const team of visible) {
      const key = team.group_name || team.meta || t('committee.detail.layoutPoolTitle')
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(team)
    }
    return [...map.entries()]
  }, [visible, t])

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-slate-900">{title}</h4>
        <Badge variant="info">{visible.length}</Badge>
      </div>
      {hint && <p className="mt-1 text-[11px] font-semibold text-slate-400">{hint}</p>}

      <div className="mt-3 max-h-[38vh] space-y-3 overflow-y-auto pe-1">
        {visible.length === 0 ? (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-5 text-center text-[11px] font-semibold text-slate-400">
            <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            {teams.length && anyHidden ? t('committee.detail.layoutPoolAllPlaced') : t('committee.detail.noTeamsToDraw')}
          </p>
        ) : (
          sections.map(([groupName, list]) => (
            <div key={groupName}>
              {list.length > 0 && list[0].group_name && (
                <p className="mb-1.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{groupName}</p>
              )}
              <div className="space-y-1.5">
                {list.map((team) => (
                  <div
                    key={team.id}
                    draggable={!busy}
                    onDragStart={(e) => {
                      if (busy) {
                        e.preventDefault()
                        return
                      }
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', String(team.id))
                      e.dataTransfer.setData('application/x-footmanager-team', String(team.id))
                      onDragStart?.(team)
                    }}
                    className="flex cursor-grab items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-colors hover:border-green-300 active:cursor-grabbing"
                  >
                    <TeamAvatar team={team} className="size-6" />
                    <span className="min-w-0 truncate text-xs font-bold text-slate-700">{team.name}</span>
                    <GripVertical className="ms-auto size-4 shrink-0 text-slate-300" />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}