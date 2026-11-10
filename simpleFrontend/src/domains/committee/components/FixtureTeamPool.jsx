import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, GripVertical } from 'lucide-react'
import { Badge } from '../../../components/dashboard/ui'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import { formatGroupName } from '../../../lib/groupNames'
import { getGroupColor } from '../../../lib/groupColors'
import { TeamAvatar } from '../../../pages/tournaments/shared'

export default function FixtureTeamPool({
  title,
  teams = [],
  orderedGroups = [],
  usedIds = null,
  busy,
  onDragStart,
  onSelectTeam,
  selectedTeamId = null,
  hint,
}) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()

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
    <div className="rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-[#111313] dark:text-[#F5F7F2]">{title}</h4>
        <Badge variant="info">{visible.length}</Badge>
      </div>
      {hint && <p className="mt-1 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">{hint}</p>}

      <div className="mt-3 max-h-[38vh] space-y-3 overflow-y-auto pe-1">
        {visible.length === 0 ? (
          <p className="flex items-center justify-center gap-2 rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-5 text-center text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
            <CheckCircle2 className="size-4 shrink-0 text-[#1F9D55] dark:text-[#30D158]" />
            {teams.length && anyHidden ? t('committee.detail.layoutPoolAllPlaced') : t('committee.detail.noTeamsToDraw')}
          </p>
        ) : (
          sections.map(([groupName, list]) => {
            const firstTeam = list[0]
            const groupColor =
              firstTeam?.group_id != null || firstTeam?.group_name
                ? getGroupColor({ id: firstTeam.group_id, name: firstTeam.group_name }, orderedGroups)
                : null
            return (
              <div key={groupName}>
                {list.length > 0 && list[0].group_name && (
                  <div className="mb-1.5 flex items-center gap-1.5">
                    {groupColor && (
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: groupColor.hex }} />
                    )}
                    <p
                      className={`text-[10px] font-black uppercase tracking-wide ${
                        groupColor ? groupColor.textCls : 'text-[#65706A] dark:text-[#B2B9B3]'
                      }`}
                    >
                      {formatGroupName(groupName, { groupId: firstTeam?.group_id, emptyLabel: groupName })}
                    </p>
                  </div>
                )}
                <div className="space-y-1.5">
                  {list.map((team) => {
                    const isSelected = selectedTeamId != null && selectedTeamId === team.id
                    return (
                      <div
                        key={team.id}
                        draggable={!busy}
                        onClick={() => !busy && onSelectTeam?.(team)}
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
                        className={`flex items-center gap-2.5 rounded-xl border border-s-4 px-3 py-2 transition-colors ${
                          onSelectTeam ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                        } ${
                          isSelected
                            ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/18 dark:bg-[#D0FF38]/15'
                            : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                        style={groupColor ? { borderInlineStartColor: groupColor.hex } : undefined}
                      >
                        <TeamAvatar
                          team={team}
                          className="size-6"
                          onClick={
                            team?.id != null
                              ? (e) => {
                                  e?.stopPropagation?.()
                                  openTeam(team)
                                }
                              : undefined
                          }
                        />
                        <span className="min-w-0 truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">
                          {team?.id != null ? <button type="button" draggable={false} onClick={(e) => { e.stopPropagation(); openTeam(team) }} className="block max-w-full truncate text-start hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{team.name}</button> : team.name}
                        </span>
                        <GripVertical className="ms-auto size-4 shrink-0 text-[#65706A]/60 dark:text-[#B2B9B3]/60" />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
