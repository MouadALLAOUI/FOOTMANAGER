import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { Toggle, inputClass } from './dashboard/ui'

export default function NeedPlayersField({ enabled, count, onEnabled, onCount }) {
  const { t } = useTranslation()

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
            <Users className="size-4" />
          </span>
          <div>
            <p className="text-sm font-extrabold text-slate-800">{t('ov.drawers.needsPlayers')}</p>
            <p className="text-[11px] text-slate-400">{t('ov.drawers.needsPlayersHint')}</p>
          </div>
        </div>
        <Toggle checked={Boolean(enabled)} onChange={onEnabled} label={t('ov.drawers.needsPlayers')} />
      </div>

      {enabled && (
        <div className="mt-3 flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={50}
            value={count ?? ''}
            onChange={(e) => onCount(e.target.value)}
            placeholder={t('ov.drawers.playersNeededPlaceholder')}
            className={inputClass}
          />
          <span className="shrink-0 text-xs font-bold text-slate-500">{t('ov.drawers.playersNeeded')}</span>
        </div>
      )}
    </div>
  )
}
