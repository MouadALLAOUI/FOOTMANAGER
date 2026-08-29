import React from 'react'
import { useTranslation } from 'react-i18next'
import { Trophy, Lock, Check, Play, Loader2 } from 'lucide-react'
import { stageLabel } from '../lib/stages'

const STATE_STYLES = {
  locked: { labelKey: 'committee.detail.roundState.locked', cls: 'bg-slate-100 text-slate-500', icon: Lock },
  available: { labelKey: 'committee.detail.roundState.available', cls: 'bg-green-100 text-green-700', icon: Play },
  in_progress: { labelKey: 'committee.detail.roundState.inProgress', cls: 'bg-amber-100 text-amber-700', icon: Loader2 },
  completed: { labelKey: 'committee.detail.roundState.completed', cls: 'bg-emerald-100 text-emerald-700', icon: Check },
}

function StateBadge({ status, locked }) {
  const { t } = useTranslation()
  const state = locked ? 'locked' : (STATE_STYLES[status] ? status : 'locked')
  const meta = STATE_STYLES[state]
  const Icon = meta.icon
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-black ${meta.cls}`}>
      <Icon className={`size-3 ${state === 'in_progress' ? 'animate-spin' : ''}`} />
      {t(meta.labelKey)}
    </span>
  )
}

export default function RoundNav({ structure, active, onSelect }) {
  const { t } = useTranslation()
  const groupStage = structure?.group_stage || []
  const knockout = structure?.knockout || []

  const isGroupActive = (matchday) => active?.type === 'group' && active.matchday === matchday
  const isKoActive = (roundId) => active?.type === 'knockout' && active.round_id === roundId

  const closed = (s) => (s.completed + (s.cancelled || 0) + (s.postponed || 0)) >= (s.total || 0)
  const lockedGroups = groupStage.map((s, i) => i > 0 && !groupStage.slice(0, i).every(closed))

  return (
    <div className="sticky top-4 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <p className="px-1 text-[11px] font-black uppercase tracking-wider text-slate-400">{t('committee.detail.stagesTitle')}</p>

      <p className="mb-1.5 mt-4 px-1 text-[10px] font-black uppercase tracking-wider text-slate-300">{t('committee.detail.groupStage')}</p>
      <div className="space-y-1">
        {groupStage.map((s, i) => (
          <RoundButton key={s.matchday} active={isGroupActive(s.matchday)} locked={lockedGroups[i]} count={s.total} onClick={() => onSelect({ type: 'group', matchday: s.matchday })}>
            {t('committee.detail.round', { n: s.matchday })}
          </RoundButton>
        ))}
      </div>

      {knockout.length > 0 && (
        <>
          <p className="mb-1.5 mt-4 px-1 text-[10px] font-black uppercase tracking-wider text-slate-300">{t('committee.detail.knockoutStages')}</p>
          <div className="space-y-1">
            {knockout.map((s) => (
              <RoundButton
                key={s.round_id}
                active={isKoActive(s.round_id)}
                locked={s.status === 'locked'}
                final={s.stage === 'final'}
                onClick={() => onSelect({ type: 'knockout', round_id: s.round_id })}
                status={s.status}
              >
                {stageLabel(t, s.stage, s.name)}
              </RoundButton>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function RoundButton({ children, active, onClick, count, final, locked, status }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-xs font-bold transition-colors ${active ? 'bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {final && <Trophy className={`size-3.5 shrink-0 ${active ? 'text-amber-300' : 'text-amber-500'}`} />}
        {locked && status !== 'completed' && <Lock className={`size-3.5 shrink-0 ${active ? 'text-white/70' : 'text-slate-300'}`} />}
        <span className="truncate">{children}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {status && !active && <StateBadge status={status} locked={locked} />}
        {count > 0 && (
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
            {count}
          </span>
        )}
      </span>
    </button>
  )
}
