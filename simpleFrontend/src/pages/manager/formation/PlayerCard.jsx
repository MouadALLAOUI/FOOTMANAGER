import { GripVertical, Plus, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Compact tactical card for a team player in the roster list.
 * Whole card starts the drag gesture; the "+" button is the keyboard-accessible
 * alternative to drop the player onto the pitch.
 */
export default function PlayerCard({
  player,
  assigned, // 'starter' | 'substitute' | null
  selected,
  onPointerDown,
  onSelect,
  onPlace,
  placeDisabled,
}) {
  const { t } = useTranslation()

  const positionLabel = player.position
    ? t(`formation.roles.${player.position}`, { defaultValue: player.position })
    : t('formation.roles.unknown')

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${player.name} — ${positionLabel}${assigned ? ` (${t(`formation.assigned.${assigned}`)})` : ''}`}
      onPointerDown={(event) => {
        if (event.target.closest('button')) return
        // Suppress native text selection / HTML drag so the pointer gesture
        // is not cancelled mid-drag.
        event.preventDefault()
        onPointerDown(player, event)
      }}
      onClick={() => onSelect(player.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(player.id)
        }
      }}
      className={`flex touch-auto items-center gap-2.5 rounded-2xl border bg-white p-2 transition-all ${
        selected
          ? 'border-emerald-400 ring-2 ring-emerald-300/50'
          : 'border-slate-200 hover:border-emerald-200'
      } ${assigned ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
    >
      <span
        className="grid size-9 shrink-0 touch-none place-items-center rounded-xl bg-slate-100 text-slate-400"
        title={t('formation.dragHint')}
      >
        <GripVertical className="size-4" aria-hidden="true" />
      </span>
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-emerald-600/10 text-sm font-black text-emerald-700">
        {player.number ?? <UserRound className="size-4" aria-hidden="true" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-slate-800">{player.name}</span>
        <span className="block text-[11px] font-semibold text-slate-500">
          {positionLabel}
          {assigned && (
            <span className={`ms-1.5 rounded-full px-1.5 py-px text-[10px] font-bold ${
              assigned === 'starter' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {t(`formation.assigned.${assigned}`)}
            </span>
          )}
        </span>
      </span>
      {!assigned && (
        <button
          type="button"
          disabled={placeDisabled}
          onClick={(event) => {
            event.stopPropagation()
            onPlace(player)
          }}
          aria-label={t('formation.placeOnPitch', { name: player.name })}
          className="grid size-8 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
