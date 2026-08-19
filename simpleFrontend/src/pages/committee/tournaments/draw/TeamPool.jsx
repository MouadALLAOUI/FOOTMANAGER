import { useTranslation } from 'react-i18next'
import { Badge } from '../../../../components/dashboard/ui'
import TeamChip from './TeamChip'

export default function TeamPool({ pool, canEdit, busy, over, onDragStart, onDragOverPool, onDragLeavePool, onDropPool }) {
  const { t } = useTranslation()

  return (
    <div
      className={`max-h-[50vh] overflow-y-auto rounded-3xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] ${
        over?.type === 'pool' ? 'border-green-400 bg-green-50/60' : 'border-slate-200/70 bg-white'
      }`}
      onDragOver={onDragOverPool}
      onDragLeave={onDragLeavePool}
      onDrop={onDropPool}
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-slate-900">{t('committee.detail.unassigned')}</h4>
        <Badge variant="info">{pool.length}</Badge>
      </div>
      <div className="mt-3 space-y-2">
        {pool.map((p) => (
          <TeamChip
            key={p.id}
            team={p.team}
            showGrip={canEdit}
            busy={busy}
            onDragStart={(e) => onDragStart(e, p)}
          />
        ))}
        {pool.length === 0 && (
          <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-[11px] font-semibold text-slate-400">
            {t('committee.detail.allDrawn')}
          </p>
        )}
      </div>
    </div>
  )
}
