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
