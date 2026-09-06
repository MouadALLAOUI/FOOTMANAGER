import { useTranslation } from 'react-i18next'
import { Flag, Shield, Target, Zap } from 'lucide-react'

const ROLE_ICONS = {
  captain: Shield,
  freeKick: Zap,
  penalty: Target,
  corner: Flag,
}

const ROLE_CLASSES = {
  captain: 'bg-amber-400 text-amber-950 ring-amber-200',
  freeKick: 'bg-violet-400 text-violet-950 ring-violet-200',
  penalty: 'bg-rose-400 text-rose-950 ring-rose-200',
  corner: 'bg-sky-400 text-sky-950 ring-sky-200',
}

/**
 * Responsive, screen-independent football pitch. Renders tactical markers
 * (boundaries, halfway line, center circle, penalty + goal areas, goals) and
 * player tokens at their normalized (0-1) coordinates.
 *
 * All pointer interactions are orchestrated by the parent (page-level drag
 * state); this component only reports hits: token pointer-downs and its own
 * element ref for drop-target hit testing.
 */
export default function FootballPitch({
  starters,
  playersById,
  pitchRef,
  selectedId,
  draggingPlayerId,
  onTokenPointerDown,
  onTokenSelect,
  onTokenKeyDown,
  roleOf,
}) {
  const { t } = useTranslation()

  const positionLabel = (key) => t(`formation.tactical.${key}`, { defaultValue: key })

  return (
    <div
      ref={pitchRef}
      dir="ltr"
      className="relative mx-auto aspect-[3/4] w-full max-w-[430px] select-none overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 shadow-[0_18px_40px_rgba(5,80,40,0.35)] ring-1 ring-emerald-900/20"
    >
      {/* boundary */}
      <div className="pointer-events-none absolute inset-2 rounded-xl border-2 border-white/70" />
      {/* halfway line */}
      <div className="pointer-events-none absolute inset-x-2 top-1/2 h-[2px] -translate-y-1/2 bg-white/60" />
      {/* center circle + spot */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/60" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80" />
      {/* penalty areas */}
      <div className="pointer-events-none absolute left-1/2 top-2 h-[15%] w-[46%] -translate-x-1/2 rounded-b-md border-2 border-t-0 border-white/60" />
      <div className="pointer-events-none absolute bottom-2 left-1/2 h-[15%] w-[46%] -translate-x-1/2 rounded-t-md border-2 border-b-0 border-white/60" />
      {/* goal areas */}
      <div className="pointer-events-none absolute left-1/2 top-2 h-[6.5%] w-[24%] -translate-x-1/2 rounded-b-md border-2 border-t-0 border-white/60" />
      <div className="pointer-events-none absolute bottom-2 left-1/2 h-[6.5%] w-[24%] -translate-x-1/2 rounded-t-md border-2 border-b-0 border-white/60" />
      {/* goals */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[2.2%] w-[18%] -translate-x-1/2 rounded-b-md bg-white/90" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[2.2%] w-[18%] -translate-x-1/2 rounded-t-md bg-white/90" />
      {/* penalty spots */}
      <div className="pointer-events-none absolute left-1/2 top-[11%] size-1.5 -translate-x-1/2 rounded-full bg-white/70" />
      <div className="pointer-events-none absolute bottom-[11%] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-white/70" />

      {starters.map((starter) => {
        const player = playersById[starter.player_id]
        const dragging = draggingPlayerId === starter.player_id
        const selected = selectedId === starter.player_id
        const roles = roleOf ? roleOf(starter.player_id) : []
        return (
          <button
            key={starter.player_id}
            type="button"
            onPointerDown={(event) => onTokenPointerDown(starter.player_id, event)}
            onClick={() => onTokenSelect(starter.player_id)}
            onKeyDown={(event) => onTokenSelect(starter.player_id, event)}
            aria-label={t('formation.tokenLabel', {
              name: player?.name || `#${starter.player_id}`,
              position: positionLabel(starter.tactical_position),
              x: Math.round(starter.x * 100),
              y: Math.round(starter.y * 100),
            })}
            aria-pressed={selected}
            className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 cursor-grab flex-col items-center focus:outline-none ${
              dragging ? 'z-30 cursor-grabbing' : ''
            }`}
            style={{ left: `${starter.x * 100}%`, top: `${starter.y * 100}%`, touchAction: 'none' }}
          >
            <span
              className={`relative grid size-11 place-items-center rounded-full border-2 bg-white font-black text-emerald-900 shadow-lg transition-all sm:size-12 ${
                dragging
                  ? 'scale-110 border-amber-400 ring-4 ring-amber-300/60'
                  : selected
                    ? 'border-emerald-300 ring-4 ring-white/70'
                    : 'border-white/90'
              }`}
            >
              <span className="text-sm sm:text-base">{player?.number ?? '?'}</span>
              {roles.length > 0 && (
                <span className="absolute -top-1.5 start-0 flex flex-col items-center" aria-hidden="true">
                  {roles.slice(0, 3).map((role) => {
                    const Icon = ROLE_ICONS[role]
                    if (!Icon) return null
                    return (
                      <span
                        key={role}
                        className={`grid size-4 place-items-center rounded-full ring-2 ${ROLE_CLASSES[role] || ''}`}
                      >
                        <Icon className="size-2.5" strokeWidth={3} />
                      </span>
                    )
                  })}
                </span>
              )}
              <span className="absolute -bottom-1.5 rounded-full bg-slate-900/85 px-1.5 py-px text-[9px] font-bold text-white">
                {positionLabel(starter.tactical_position)}
              </span>
            </span>
            <span className="mt-2 max-w-[72px] truncate rounded-full bg-slate-900/70 px-1.5 py-px text-[10px] font-bold text-white">
              {player?.name || '…'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
