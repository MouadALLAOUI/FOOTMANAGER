// Persistent group names come directly from the database via API payloads
// (`groups.name` and `tournament.plan.group_names`).

const groupNamesByGroupId = new Map()
const groupNamesByTourId = new Map()

/**
 * Syncs database-persisted group names from a tournament detail API payload (`tournament.plan.group_names`).
 */
export function syncTournamentGroupNames(tournament) {
  if (!tournament || typeof tournament !== 'object') return
  const tid = tournament.id != null ? String(tournament.id) : null
  const rawMap = tournament.plan?.group_names
  if (rawMap && typeof rawMap === 'object' && !Array.isArray(rawMap)) {
    const cleanMap = {}
    for (const [k, v] of Object.entries(rawMap)) {
      const trimmed = String(v || '').trim()
      if (trimmed) {
        cleanMap[String(k)] = trimmed
        groupNamesByGroupId.set(String(k), trimmed)
      }
    }
    if (tid) {
      groupNamesByTourId.set(tid, cleanMap)
    }
  } else if (tid) {
    const prev = groupNamesByTourId.get(tid)
    if (prev) {
      for (const k of Object.keys(prev)) {
        groupNamesByGroupId.delete(String(k))
      }
      groupNamesByTourId.delete(tid)
    }
  }
}

/**
 * Updates the in-memory synced map after a successful database save.
 */
export function registerTournamentGroupName(tournamentId, groupId, customName) {
  const trimmed = String(customName || '').trim()
  if (!trimmed || groupId == null) return
  const gid = String(groupId)
  groupNamesByGroupId.set(gid, trimmed)
  if (tournamentId != null) {
    const tid = String(tournamentId)
    const prev = groupNamesByTourId.get(tid) || {}
    groupNamesByTourId.set(tid, { ...prev, [gid]: trimmed })
  }
}

/**
 * Resolves the effective group name from database-persisted `tournament.plan.group_names`
 * or falls back to `rawName` (`groups.name`).
 */
export function resolvePersistedGroupName(rawName, options = {}) {
  const { groupId, tournamentId } = options
  if (groupId != null) {
    const gid = String(groupId)
    if (tournamentId != null) {
      const tourMap = groupNamesByTourId.get(String(tournamentId))
      if (tourMap && tourMap[gid]) return tourMap[gid]
    }
    if (groupNamesByGroupId.has(gid)) {
      return groupNamesByGroupId.get(gid)
    }
  }
  return String(rawName || '').trim()
}

export function getCustomGroupName(tournamentId, groupId) {
  if (groupId == null) return null
  return resolvePersistedGroupName('', { tournamentId, groupId }) || null
}

export function setCustomGroupName(tournamentId, groupId, customName) {
  registerTournamentGroupName(tournamentId, groupId, customName)
}

/**
 * Formats a group name cleanly whether it is a default code ("A", "B", "1")
 * or a custom group name ("مجموعة الأطلس", "مجموعة الصقور", "Groupe Atlas", "المجموعة الأولى").
 */
export function formatGroupName(rawName, options = {}) {
  const { prefix = 'المجموعة', emptyLabel = 'جدول الترتيب' } = options
  const effective = resolvePersistedGroupName(rawName, options)

  if (!effective) return emptyLabel

  const lower = effective.toLowerCase()
  if (
    effective.startsWith('المجموعة') ||
    effective.startsWith('مجموعة') ||
    effective.startsWith('جدول') ||
    lower.startsWith('group') ||
    lower.startsWith('groupe') ||
    lower.startsWith('poule')
  ) {
    return effective
  }

  // Short code like "A", "B", "C", "1", "2" -> prepend "المجموعة "
  if (effective.length <= 2) {
    return `${prefix} ${effective}`
  }

  // Custom name without "مجموعة" prefix (e.g. "الأطلس", "الصقور") -> return as-is
  return effective
}
