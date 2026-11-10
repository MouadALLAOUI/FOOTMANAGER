// Persistent group names come directly from the database via API payloads.
// Never override persisted backend names with stale client storage.

export function getCustomGroupName() {
  return null
}

export function setCustomGroupName() {
  // No-op: group renaming persists in the backend database.
}

/**
 * Formats a group name cleanly whether it is a default code ("A", "B", "1")
 * or a custom group name ("مجموعة الأطلس", "مجموعة الصقور", "Groupe Atlas", "المجموعة الأولى").
 */
export function formatGroupName(rawName, options = {}) {
  const { prefix = 'المجموعة', emptyLabel = 'جدول الترتيب' } = options
  const effective = String(rawName || '').trim()

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
