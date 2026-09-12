import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, Flag, Shield, Target, Zap } from 'lucide-react'
import { photoThumb } from '../../../lib/thumb'

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
  dragGhost,
}) {
  const { t } = useTranslation()
  const [failedAvatars, setFailedAvatars] = useState({})

  const positionLabel = (key) => t(`formation.tactical.${key}`, { defaultValue: key })
  const hasGK = starters.some((s) => s.tactical_position === 'GK')

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

      {/* Our Goal / Goalkeeper Banner (Top) */}
      <div className="pointer-events-none absolute left-1/2 top-2.5 z-0 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/25 bg-slate-950/45 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm backdrop-blur-sm">
        <Shield className="size-3 text-emerald-300" aria-hidden="true" />
        <span>{t('formation.ourGoal', 'مرمانا (حارس المرمى)')}</span>
      </div>

      {/* Opponent Goal / Attack Banner (Bottom) */}
      <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-0 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/25 bg-slate-950/45 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-sm backdrop-blur-sm">
        <Target className="size-3 text-rose-300" aria-hidden="true" />
        <span>{t('formation.opponentGoal', 'مرمى الخصم (الهجوم)')}</span>
      </div>

      {/* Attack Direction Indicator along the side */}
      <div
        className="pointer-events-none absolute right-2.5 top-1/2 z-0 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full border border-white/25 bg-slate-950/45 px-1 py-2 text-[8px] font-black text-white/90 shadow-sm backdrop-blur-sm"
        title={t('formation.attackDirection', 'اتجاه الهجوم')}
      >
        <span className="[writing-mode:vertical-rl] tracking-widest select-none text-white/85">
          {t('formation.attackDirection', 'اتجاه الهجوم')}
        </span>
        <ArrowDown className="size-3 text-emerald-300 animate-pulse" aria-hidden="true" />
      </div>

      {/* Goalkeeper slot placeholder when not yet assigned */}
      {!hasGK && (
        <div
          className="pointer-events-none absolute left-1/2 top-[10%] z-0 flex size-11 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-2 border-dashed border-white/70 bg-white/10 shadow-inner sm:size-12"
          aria-hidden="true"
        >
          <span className="text-[11px] font-black text-white drop-shadow">GK</span>
          <span className="text-[8px] font-bold text-white/90 drop-shadow">{t('formation.gkSlot', 'حارس')}</span>
        </div>
      )}

      {/* Live Drag Target Ghost on Pitch */}
      {dragGhost && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 transition-[left,top] duration-75 ease-out"
          style={{ left: `${dragGhost.x * 100}%`, top: `${dragGhost.y * 100}%` }}
        >
          <div className="relative grid size-11 sm:size-12 place-items-center rounded-full border-2 border-dashed border-amber-300 bg-amber-400/30 text-white font-black shadow-xl ring-4 ring-amber-300/40 backdrop-blur-sm">
            {dragGhost.avatar ? (
              <img
                src={dragGhost.avatar}
                alt=""
                className="size-full rounded-full object-cover opacity-85"
              />
            ) : (
              <span className="text-sm sm:text-base drop-shadow">{dragGhost.number ?? '?'}</span>
            )}
            {dragGhost.label && (
              <span className="absolute -bottom-1.5 z-10 rounded-full bg-slate-950 px-1.5 py-px text-[9px] font-bold text-amber-300">
                {dragGhost.label}
              </span>
            )}
          </div>
          {dragGhost.name && (
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 max-w-[76px] truncate rounded-full bg-slate-950/80 px-1.5 py-px text-[10px] font-bold text-amber-200">
              {dragGhost.name}
            </span>
          )}
        </div>
      )}

      {starters.map((starter) => {
        const playerId = starter.player_id ?? starter.id
        const player = playersById[playerId]
        const dragging = draggingPlayerId === playerId
        const selected = selectedId === playerId
        const roles = roleOf ? roleOf(playerId) : []
        const rawAvatar = photoThumb(player) || player?.photo_thumbnail_url || player?.photo_url || player?.avatar_url
        const hasAvatar = Boolean(rawAvatar && !failedAvatars[playerId])
        return (
          <div
            key={playerId}
            className={`absolute z-10 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 ${
              dragging ? 'z-30 opacity-30 scale-95' : ''
            }`}
            style={{ left: `${starter.x * 100}%`, top: `${starter.y * 100}%`, touchAction: 'none' }}
          >
            <button
              type="button"
              onPointerDown={(event) => onTokenPointerDown(playerId, event)}
              onClick={() => onTokenSelect(playerId)}
              onKeyDown={(event) => (onTokenKeyDown ? onTokenKeyDown(playerId, event) : onTokenSelect(playerId, event))}
              aria-label={t('formation.tokenLabel', {
                name: player?.name || `#${playerId}`,
                position: positionLabel(starter.tactical_position),
                x: Math.round(starter.x * 100),
                y: Math.round(starter.y * 100),
              })}
              aria-pressed={selected}
              className="relative cursor-grab focus:outline-none"
            >
              <span
                className={`relative grid size-11 place-items-center rounded-full border-2 bg-white font-black text-emerald-900 shadow-lg transition-all sm:size-12 ${
                  dragging
                    ? 'scale-110 border-amber-400 ring-4 ring-amber-300/60'
                    : selected
                      ? 'border-emerald-300 ring-4 ring-white/70'
                      : 'border-white/90 hover:scale-105'
                }`}
              >
                {hasAvatar ? (
                  <img
                    src={rawAvatar}
                    alt={player?.name || ''}
                    loading="eager"
                    decoding="async"
                    onError={() => setFailedAvatars((prev) => ({ ...prev, [playerId]: true }))}
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sm sm:text-base">{player?.number ?? (player?.shirt_number ?? '?')}</span>
                )}

                {roles.length > 0 && (
                  <span className="absolute -top-1.5 start-0 z-10 flex flex-col items-center" aria-hidden="true">
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
                <span className="absolute -bottom-1.5 z-10 rounded-full bg-slate-900/85 px-1.5 py-px text-[9px] font-bold text-white shadow">
                  {positionLabel(starter.tactical_position)}
                </span>
              </span>
            </button>
            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 max-w-[76px] truncate rounded-full bg-slate-900/75 px-1.5 py-px text-[10px] font-bold text-white text-center">
              {player?.name || '…'}
            </span>
          </div>
        )
      })}
    </div>
  )
}
