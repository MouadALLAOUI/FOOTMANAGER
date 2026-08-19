import { useTranslation } from 'react-i18next'
import { Badge } from '../../../../components/dashboard/ui'
import TeamChip from './TeamChip'

export default function GroupColumn({
  group,
  members,
  cap,
  canEdit,
  busy,
  over,
  onDragStart,
  onGroupDragOver,
  onGroupDragLeave,
  onGroupDrop,
  onTeamDrop,
}) {
  const { t } = useTranslation()
  const fixed = cap !== Infinity && cap > 0
  const highlighted = over?.type === 'group' && over.id === group.id

  return (
    <div
      className={`min-h-[120px] rounded-3xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors ${
        highlighted ? 'border-green-400 bg-green-50/60' : 'border-slate-200/70 bg-white'
      }`}
      onDragOver={(e) => {
        if (!canEdit) return
        e.preventDefault()
        e.stopPropagation()
        onGroupDragOver(group.id)
      }}
      onDragLeave={() => onGroupDragLeave(group.id)}
      onDrop={(e) => onGroupDrop(e, group.id)}
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-slate-900">{group.name}</h4>
        <div className="flex items-center gap-2">
          <Badge variant="info">{t('committee.detail.teamsCount', { count: members.length })}</Badge>
          {fixed && (
            <Badge variant={members.length >= cap ? 'success' : 'neutral'}>{`${members.length}/${cap}`}</Badge>
          )}
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {members.map((p) => (
          <TeamChip
            key={p.id}
            team={p.team}
            showGrip={canEdit}
            busy={busy}
            onDragStart={(e) => onDragStart(e, p)}
            onDragOver={(e) => {
              if (!canEdit) return
              e.preventDefault()
              e.stopPropagation()
              onGroupDragOver(group.id)
            }}
            onDrop={(e) => onTeamDrop(e, group.id, p.group_position)}
          />
        ))}
        {members.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] font-semibold text-slate-400">
            {t('committee.detail.dropHere')}
          </p>
        )}
      </div>
    </div>
  )
}
