export const membersOf = (teams, groupId) =>
  (teams || [])
    .filter((p) => p.group?.id === groupId)
    .sort((a, b) => (a.group_position ?? 0) - (b.group_position ?? 0))

export const chipClass = (busy) =>
  `flex cursor-grab items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
    busy === 'save' ? 'opacity-60' : 'border-slate-200 bg-slate-50 hover:border-slate-300 active:cursor-grabbing'
  }`

/**
 * Move a pivot within the board. target is one of:
 *   { type: 'pool' }
 *   { type: 'group', id, position? }
 *
 * In fixed mode a full group never overflows: the team is redirected to the
 * next group (in board order) that still has space. In free mode groups have no
 * size limit and teams drop straight in.
 *
 * @returns {{ teams: Array, redirectedTo: string|null }} next local board state
 */
export function commitMove(teams, pivotId, target, { groups, mode, cap }) {
  const out = teams.map((p) => ({ ...p, group: p.group ? { ...p.group } : null }))
  const pivot = out.find((p) => p.id === pivotId)
  if (!pivot) return { teams: out, redirectedTo: null }

  const sourceGid = pivot.group?.id ?? null
  pivot.group = null
  pivot.group_position = null

  const compact = (gid) => {
    if (gid == null) return []
    const members = out
      .filter((p) => p.group?.id === gid)
      .sort((a, b) => (a.group_position ?? 0) - (b.group_position ?? 0))
    members.forEach((p, i) => { p.group_position = i + 1 })
    return members
  }

  compact(sourceGid)

  let targetGid = null
  let redirectedTo = null

  if (target.type === 'group') {
    targetGid = target.id
    const fixed = mode === 'fixed' && cap > 0 && Number.isFinite(cap)
    const isFull = fixed && targetGid !== sourceGid && membersOf(out, targetGid).length >= cap

    if (isFull) {
      const ordered = groups || []
      const start = ordered.findIndex((g) => g.id === targetGid)
      const next = ordered.find(
        (g, i) => i > start && membersOf(out, g.id).length < cap,
      ) ?? ordered.find((g, i) => i <= start && membersOf(out, g.id).length < cap)

      if (!next) return { teams: out, redirectedTo: null }
      redirectedTo = next.name || ''
      targetGid = next.id
    }
  }

  if (targetGid == null) {
    return { teams: out, redirectedTo }
  }

  const members = compact(targetGid)
  const pos = redirectedTo ? members.length + 1 : (target.position ?? members.length + 1)
  const slot = Math.max(1, Math.min(pos, members.length + 1))
  members.forEach((p, i) => { if (i + 1 >= slot) p.group_position = i + 2 })

  const groupName = (groups || []).find((g) => g.id === targetGid)?.name ?? ''
  pivot.group = { id: targetGid, name: groupName }
  pivot.group_position = slot

  return { teams: out, redirectedTo }
}

/**
 * Free-mode group naming, mirrored from the backend
 * (TournamentSetupService::groupLabel): A..Z then G27, G28, ...
 */
export const groupLabel = (index) => (index <= 26 ? String.fromCharCode(64 + index) : `G${index}`)

/**
 * Recommend the next free group label given the current set of group names.
 */
export function nextGroupLabel(groups) {
  const used = new Set((groups || []).map((g) => g.name).filter(Boolean))
  let index = (groups?.length || 0) + 1
  while (used.has(groupLabel(index))) index++
  return groupLabel(index)
}

/**
 * Free-mode invariant, applied to the local board while manually editing,
 * mirroring the backend `ensureFreeNextGroup`: exactly one empty container must
 * always exist. Every group that holds members is kept, then a single empty one
 * is kept (the first empty in board order); any additional empty groups are
 * dropped. When no group is empty a fresh placeholder empty group is appended.
 *
 * @param teams    current board pivots
 * @param groups   current displayed group list [{ id, name, isNew? }]
 * @param seqRef   useRef counter used to mint stable placeholder ids
 * @returns next displayed group list
 */
export function deriveDisplayGroups(teams, groups, seqRef) {
  const memberIds = new Set((teams || []).filter((p) => p?.group).map((p) => p?.group?.id))
  const withMembers = (groups || []).filter((g) => memberIds.has(g.id))
  const empties = (groups || []).filter((g) => !memberIds.has(g.id))
  const out = [...withMembers]
  if (empties.length >= 1) {
    out.push(empties[0])
  } else {
    seqRef.current += 1
    out.push({ id: `__new__${seqRef.current}`, name: nextGroupLabel(groups || []), isNew: true })
  }
  return out
}

/** New (not yet persisted) placeholder groups are identified by a string id. */
export const isNewGroup = (g) => typeof g?.id === 'string'
