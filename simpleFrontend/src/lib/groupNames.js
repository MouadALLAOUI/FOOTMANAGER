const STORAGE_KEY = 'aji_custom_group_names_v1'

function readStore() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    window.dispatchEvent(new CustomEvent('aji:group-names-updated'))
  } catch {
    // ignore storage errors
  }
}

export function getCustomGroupName(groupId, tournamentId = null) {
  if (groupId == null) return null
  const store = readStore()
  if (tournamentId != null && store[`${tournamentId}:${groupId}`]) {
    return store[`${tournamentId}:${groupId}`]
  }
  return store[String(groupId)] || null
}

export function setCustomGroupName(groupId, name, tournamentId = null) {
  if (groupId == null) return
  const trimmed = String(name || '').trim()
  const store = readStore()
  const scopedKey = tournamentId != null ? `${tournamentId}:${groupId}` : null

  if (!trimmed) {
    if (scopedKey) delete store[scopedKey]
    delete store[String(groupId)]
  } else {
    if (scopedKey) store[scopedKey] = trimmed
    store[String(groupId)] = trimmed
  }
  writeStore(store)
}

/**
 * Formats a group name cleanly whether it is a default code ("A", "B", "1")
 * or a custom group name ("مجموعة الأطلس", "مجموعة الصقور", "Groupe Atlas", "المجموعة الأولى").
 */
export function formatGroupName(rawName, options = {}) {
  const { groupId = null, tournamentId = null, prefix = 'المجموعة', emptyLabel = 'جدول الترتيب' } = options
  const custom = getCustomGroupName(groupId, tournamentId)
  const effective = String(custom || rawName || '').trim()

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
