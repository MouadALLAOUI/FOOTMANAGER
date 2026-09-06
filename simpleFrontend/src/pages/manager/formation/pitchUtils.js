// Pure helpers for the team formation editor.
// Coordinates are always normalized 0.0 - 1.0 (never pixels); the pitch maps
// them onto whatever size it is rendered at.

export const FORMATS = ['5v5', '7v7', '8v8', '11v11']

export const maxStartersFor = (format) =>
  ({ '5v5': 5, '7v7': 7, '8v8': 8, '11v11': 11 })[format] || 7

export const clamp01 = (value) => Math.min(1, Math.max(0, value))

export const round3 = (value) => Math.round(value * 1000) / 1000

// Maps a player's normal position onto the default tactical key used when a
// starter is placed without a preset slot.
export const defaultTacticalKey = (position) =>
  ({ goalkeeper: 'GK', defender: 'CB', midfielder: 'CM', forward: 'ST' })[position] || 'CM'

/**
 * Role-holder state keys stored on a team formation (captain + set pieces).
 * Values are player ids; null when unassigned.
 */
export const ROLE_FIELDS = [
  'captain_id',
  'vice_captain_id',
  'free_kick_taker_id',
  'penalty_taker_id',
  'corner_taker_id',
]

/**
 * Normalizes the starter/substitute state into the API payload shape.
 * Role holders are only sent when they are part of the starting XI; a holder
 * moved to the bench is dropped here so the backend never stores bench roles.
 */
export function buildFormationPayload(state) {
  const starterIds = new Set(state.starters.map((s) => s.player_id))
  const role = (id) => (id && starterIds.has(id) ? id : null)

  return {
    name: state.name?.trim() || state.format,
    format: state.format,
    formation: state.presetLabel || null,
    preset_key: state.presetKey || null,
    is_active: !!state.isActive,
    captain_id: role(state.captainId),
    vice_captain_id: role(state.viceCaptainId),
    free_kick_taker_id: role(state.freeKickId),
    penalty_taker_id: role(state.penaltyId),
    corner_taker_id: role(state.cornerId),
    players: [
      ...state.starters.map((s, index) => ({
        player_id: s.player_id,
        is_starter: true,
        tactical_position: s.tactical_position,
        x: round3(s.x),
        y: round3(s.y),
        sort_order: index,
      })),
      ...state.substitutes.map((playerId, index) => ({
        player_id: playerId,
        is_starter: false,
        tactical_position: null,
        x: null,
        y: null,
        sort_order: index,
      })),
    ],
  }
}

/**
 * Stable snapshot of the editable state used to detect unsaved changes.
 */
export function snapshotOf(state) {
  return JSON.stringify({
    name: state.name,
    format: state.format,
    presetKey: state.presetKey,
    presetLabel: state.presetLabel,
    isActive: !!state.isActive,
    formationId: state.formationId,
    captainId: state.captainId,
    viceCaptainId: state.viceCaptainId,
    freeKickId: state.freeKickId,
    penaltyId: state.penaltyId,
    cornerId: state.cornerId,
    starters: [...state.starters]
      .sort((a, b) => a.player_id - b.player_id)
      .map((s) => [s.player_id, s.tactical_position, round3(s.x), round3(s.y)]),
    substitutes: [...state.substitutes].sort((a, b) => a - b),
  })
}

/**
 * Reslots the CURRENT starters onto a preset structure without changing who
 * is on the pitch: players keep their place, only tactical keys/coordinates
 * are reassigned (matched by role first, then order). Extra starters beyond
 * the preset's slot count move to substitutes.
 */
export function applyPresetSlots(starters, slots) {
  const available = [...slots]
  const kept = []
  const overflow = []

  for (const starter of starters) {
    const roleIndex = available.findIndex(
      (slot) => slot.role && starter.tactical_position && roleOf(starter.tactical_position, slots) === slot.role,
    )
    const taken = roleIndex >= 0
      ? available.splice(roleIndex, 1)[0]
      : available.shift()

    if (!taken) {
      overflow.push(starter)
      continue
    }

    kept.push({
      ...starter,
      tactical_position: taken.tactical_position,
      x: taken.x,
      y: taken.y,
    })
  }

  return { starters: kept, overflow }
}

function roleOf(tacticalKey, slots) {
  return slots.find((slot) => slot.tactical_position === tacticalKey)?.role || null
}

/**
 * First free preset slot for the format (used by the non-drag "place on
 * pitch" action). Prefers slots matching the player's normal-position role.
 */
export function firstFreeSlot(slots, usedKeys, playerPosition) {
  const free = slots.filter(
    (slot) => !usedKeys.some((key) => Math.abs(key.x - slot.x) < 0.001 && Math.abs(key.y - slot.y) < 0.001),
  )
  const wantedRole = playerPosition
    ? ({ goalkeeper: 'goalkeeper', defender: 'defender', midfielder: 'midfielder', forward: 'forward' })[playerPosition]
    : null

  return free.find((slot) => slot.role === wantedRole) || free[0] || null
}
