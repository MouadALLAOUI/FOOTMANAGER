import { formatGroupName } from './groupNames'

export const GROUP_COLOR_PALETTE = [
  {
    key: 'blue',
    name: 'الأزرق',
    hex: '#3B82F6',
    dotCls: 'bg-[#3B82F6]',
    stripeCls: 'bg-[#3B82F6]',
    borderStartCls: 'border-s-4 border-s-[#3B82F6]',
    badgeCls:
      'bg-[#3B82F6]/12 dark:bg-[#3B82F6]/20 text-[#1D4ED8] dark:text-[#93C5FD] border border-[#3B82F6]/30 dark:border-[#3B82F6]/45',
    softCardCls:
      'border-[#3B82F6]/30 dark:border-[#3B82F6]/40 bg-[#3B82F6]/[0.05] dark:bg-[#3B82F6]/[0.10]',
    headerBgCls: 'bg-[#3B82F6]/[0.08] dark:bg-[#3B82F6]/[0.15]',
    activePillCls:
      'border-[#3B82F6] bg-[#3B82F6]/16 dark:bg-[#3B82F6]/25 text-[#1E40AF] dark:text-[#DBEAFE] shadow-2xs',
    textCls: 'text-[#1D4ED8] dark:text-[#93C5FD]',
    ringCls: 'ring-1 ring-[#3B82F6]/40',
  },
  {
    key: 'green',
    name: 'الأخضر',
    hex: '#22C55E',
    dotCls: 'bg-[#22C55E]',
    stripeCls: 'bg-[#22C55E]',
    borderStartCls: 'border-s-4 border-s-[#22C55E]',
    badgeCls:
      'bg-[#22C55E]/12 dark:bg-[#22C55E]/20 text-[#15803D] dark:text-[#86EFAC] border border-[#22C55E]/30 dark:border-[#22C55E]/45',
    softCardCls:
      'border-[#22C55E]/30 dark:border-[#22C55E]/40 bg-[#22C55E]/[0.05] dark:bg-[#22C55E]/[0.10]',
    headerBgCls: 'bg-[#22C55E]/[0.08] dark:bg-[#22C55E]/[0.15]',
    activePillCls:
      'border-[#22C55E] bg-[#22C55E]/16 dark:bg-[#22C55E]/25 text-[#166534] dark:text-[#DCFCE7] shadow-2xs',
    textCls: 'text-[#15803D] dark:text-[#86EFAC]',
    ringCls: 'ring-1 ring-[#22C55E]/40',
  },
  {
    key: 'orange',
    name: 'البرتقالي',
    hex: '#F97316',
    dotCls: 'bg-[#F97316]',
    stripeCls: 'bg-[#F97316]',
    borderStartCls: 'border-s-4 border-s-[#F97316]',
    badgeCls:
      'bg-[#F97316]/12 dark:bg-[#F97316]/20 text-[#C2410C] dark:text-[#FDBA74] border border-[#F97316]/30 dark:border-[#F97316]/45',
    softCardCls:
      'border-[#F97316]/30 dark:border-[#F97316]/40 bg-[#F97316]/[0.05] dark:bg-[#F97316]/[0.10]',
    headerBgCls: 'bg-[#F97316]/[0.08] dark:bg-[#F97316]/[0.15]',
    activePillCls:
      'border-[#F97316] bg-[#F97316]/16 dark:bg-[#F97316]/25 text-[#9A3412] dark:text-[#FFEDD5] shadow-2xs',
    textCls: 'text-[#C2410C] dark:text-[#FDBA74]',
    ringCls: 'ring-1 ring-[#F97316]/40',
  },
  {
    key: 'purple',
    name: 'البنفسجي',
    hex: '#A855F7',
    dotCls: 'bg-[#A855F7]',
    stripeCls: 'bg-[#A855F7]',
    borderStartCls: 'border-s-4 border-s-[#A855F7]',
    badgeCls:
      'bg-[#A855F7]/12 dark:bg-[#A855F7]/20 text-[#7E22CE] dark:text-[#D8B4FE] border border-[#A855F7]/30 dark:border-[#A855F7]/45',
    softCardCls:
      'border-[#A855F7]/30 dark:border-[#A855F7]/40 bg-[#A855F7]/[0.05] dark:bg-[#A855F7]/[0.10]',
    headerBgCls: 'bg-[#A855F7]/[0.08] dark:bg-[#A855F7]/[0.15]',
    activePillCls:
      'border-[#A855F7] bg-[#A855F7]/16 dark:bg-[#A855F7]/25 text-[#6B21A8] dark:text-[#F3E8FF] shadow-2xs',
    textCls: 'text-[#7E22CE] dark:text-[#D8B4FE]',
    ringCls: 'ring-1 ring-[#A855F7]/40',
  },
  {
    key: 'teal',
    name: 'الفيروزي',
    hex: '#14B8A6',
    dotCls: 'bg-[#14B8A6]',
    stripeCls: 'bg-[#14B8A6]',
    borderStartCls: 'border-s-4 border-s-[#14B8A6]',
    badgeCls:
      'bg-[#14B8A6]/12 dark:bg-[#14B8A6]/20 text-[#0F766E] dark:text-[#5EEAD4] border border-[#14B8A6]/30 dark:border-[#14B8A6]/45',
    softCardCls:
      'border-[#14B8A6]/30 dark:border-[#14B8A6]/40 bg-[#14B8A6]/[0.05] dark:bg-[#14B8A6]/[0.10]',
    headerBgCls: 'bg-[#14B8A6]/[0.08] dark:bg-[#14B8A6]/[0.15]',
    activePillCls:
      'border-[#14B8A6] bg-[#14B8A6]/16 dark:bg-[#14B8A6]/25 text-[#115E59] dark:text-[#CCFBF1] shadow-2xs',
    textCls: 'text-[#0F766E] dark:text-[#5EEAD4]',
    ringCls: 'ring-1 ring-[#14B8A6]/40',
  },
  {
    key: 'rose',
    name: 'الوردي',
    hex: '#F43F5E',
    dotCls: 'bg-[#F43F5E]',
    stripeCls: 'bg-[#F43F5E]',
    borderStartCls: 'border-s-4 border-s-[#F43F5E]',
    badgeCls:
      'bg-[#F43F5E]/12 dark:bg-[#F43F5E]/20 text-[#BE123C] dark:text-[#FDA4AF] border border-[#F43F5E]/30 dark:border-[#F43F5E]/45',
    softCardCls:
      'border-[#F43F5E]/30 dark:border-[#F43F5E]/40 bg-[#F43F5E]/[0.05] dark:bg-[#F43F5E]/[0.10]',
    headerBgCls: 'bg-[#F43F5E]/[0.08] dark:bg-[#F43F5E]/[0.15]',
    activePillCls:
      'border-[#F43F5E] bg-[#F43F5E]/16 dark:bg-[#F43F5E]/25 text-[#9F1239] dark:text-[#FFE4E6] shadow-2xs',
    textCls: 'text-[#BE123C] dark:text-[#FDA4AF]',
    ringCls: 'ring-1 ring-[#F43F5E]/40',
  },
  {
    key: 'cyan',
    name: 'السماوي',
    hex: '#06B6D4',
    dotCls: 'bg-[#06B6D4]',
    stripeCls: 'bg-[#06B6D4]',
    borderStartCls: 'border-s-4 border-s-[#06B6D4]',
    badgeCls:
      'bg-[#06B6D4]/12 dark:bg-[#06B6D4]/20 text-[#0E7490] dark:text-[#67E8F9] border border-[#06B6D4]/30 dark:border-[#06B6D4]/45',
    softCardCls:
      'border-[#06B6D4]/30 dark:border-[#06B6D4]/40 bg-[#06B6D4]/[0.05] dark:bg-[#06B6D4]/[0.10]',
    headerBgCls: 'bg-[#06B6D4]/[0.08] dark:bg-[#06B6D4]/[0.15]',
    activePillCls:
      'border-[#06B6D4] bg-[#06B6D4]/16 dark:bg-[#06B6D4]/25 text-[#155E75] dark:text-[#CFFAFE] shadow-2xs',
    textCls: 'text-[#0E7490] dark:text-[#67E8F9]',
    ringCls: 'ring-1 ring-[#06B6D4]/40',
  },
  {
    key: 'indigo',
    name: 'النيلي',
    hex: '#6366F1',
    dotCls: 'bg-[#6366F1]',
    stripeCls: 'bg-[#6366F1]',
    borderStartCls: 'border-s-4 border-s-[#6366F1]',
    badgeCls:
      'bg-[#6366F1]/12 dark:bg-[#6366F1]/20 text-[#4338CA] dark:text-[#A5B4FC] border border-[#6366F1]/30 dark:border-[#6366F1]/45',
    softCardCls:
      'border-[#6366F1]/30 dark:border-[#6366F1]/40 bg-[#6366F1]/[0.05] dark:bg-[#6366F1]/[0.10]',
    headerBgCls: 'bg-[#6366F1]/[0.08] dark:bg-[#6366F1]/[0.15]',
    activePillCls:
      'border-[#6366F1] bg-[#6366F1]/16 dark:bg-[#6366F1]/25 text-[#3730A3] dark:text-[#E0E7FF] shadow-2xs',
    textCls: 'text-[#4338CA] dark:text-[#A5B4FC]',
    ringCls: 'ring-1 ring-[#6366F1]/40',
  },
]

const NEUTRAL_GROUP_COLOR = {
  key: 'neutral',
  name: 'محايد',
  hex: '#65706A',
  dotCls: 'bg-[#65706A]',
  stripeCls: 'bg-[#65706A]',
  borderStartCls: 'border-s-4 border-s-[#E1E5DF] dark:border-s-[#303832]',
  badgeCls:
    'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] border border-[#E1E5DF] dark:border-[#303832]',
  softCardCls: 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]',
  headerBgCls: 'bg-[#F7F8F5] dark:bg-[#252B27]',
  activePillCls:
    'border-[#111313] dark:border-[#D0FF38] bg-[#111313]/5 dark:bg-[#D0FF38]/15 text-[#111313] dark:text-[#F5F7F2]',
  textCls: 'text-[#65706A] dark:text-[#B2B9B3]',
  ringCls: 'ring-1 ring-[#E1E5DF] dark:ring-[#303832]',
}

const CODE_INDEX_MAP = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  E: 4,
  F: 5,
  G: 6,
  H: 7,
  1: 0,
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  8: 7,
  أ: 0,
  ب: 1,
  ج: 2,
  د: 3,
  ه: 4,
  و: 5,
  ز: 6,
  ح: 7,
}

function normalizeId(val) {
  if (val == null || val === '') return null
  const num = Number(val)
  return Number.isFinite(num) ? num : String(val)
}

function stripGroupPrefix(raw) {
  return String(raw || '')
    .replace(/^(المجموعة|مجموعة|Groupe|Group|Poule)\s+/i, '')
    .trim()
}

export function extractGroupShortCode(rawName, fallbackIndex = null) {
  const clean = stripGroupPrefix(rawName)
  if (!clean) {
    return fallbackIndex != null && fallbackIndex >= 0
      ? String.fromCharCode(65 + (fallbackIndex % 26))
      : '—'
  }
  const upper = clean.toUpperCase()
  if (/^[A-Z0-9]{1,2}$/.test(upper)) return upper
  const arabicOrLetter = clean.charAt(0).toUpperCase()
  return arabicOrLetter || '—'
}

export function sortOrderedGroups(groups = []) {
  const seen = new Map()
  for (const g of groups || []) {
    if (!g) continue
    const gid = normalizeId(g.id ?? g.group_id ?? g.key)
    const gname = String(g.name ?? g.group_name ?? '').trim()
    const key = gid != null ? `id:${gid}` : gname ? `name:${gname}` : null
    if (!key || seen.has(key)) continue
    seen.set(key, {
      id: gid,
      name: gname,
    })
  }
  return [...seen.values()].sort((a, b) => {
    if (typeof a.id === 'number' && typeof b.id === 'number') return a.id - b.id
    if (a.id != null && b.id != null) return String(a.id).localeCompare(String(b.id), 'en')
    return (a.name || '').localeCompare(b.name || '', 'ar')
  })
}

export function extractOrderedGroupsFromFixtures(fixtures = [], extraTeams = []) {
  const collected = []
  for (const t of extraTeams || []) {
    if (t?.group?.id != null || t?.group?.name) {
      collected.push({ id: t.group.id, name: t.group.name })
    } else if (t?.group_id != null || t?.group_name) {
      collected.push({ id: t.group_id, name: t.group_name })
    }
  }
  for (const f of fixtures || []) {
    if (f?.group?.id != null || f?.group?.name) {
      collected.push({ id: f.group.id, name: f.group.name })
    }
  }
  return sortOrderedGroups(collected)
}

export function resolveGroupColorIndex(groupOrKey, orderedGroups = []) {
  if (!groupOrKey) return -1

  const isObj = typeof groupOrKey === 'object'
  const rawName = isObj
    ? groupOrKey.name ?? groupOrKey.group_name ?? ''
    : typeof groupOrKey === 'string'
      ? groupOrKey
      : ''
  const groupId = isObj
    ? normalizeId(groupOrKey.id ?? groupOrKey.group_id ?? groupOrKey.key)
    : typeof groupOrKey === 'number'
      ? groupOrKey
      : null

  // 1. Match explicit short group codes (A/B/C/1/2/3/أ/ب...) so Group A is always Blue, Group B is always Green
  const stripped = stripGroupPrefix(rawName)
  if (stripped) {
    const firstToken = stripped.toUpperCase()
    if (firstToken in CODE_INDEX_MAP) {
      return CODE_INDEX_MAP[firstToken] % GROUP_COLOR_PALETTE.length
    }
    const singleChar = stripped.charAt(0).toUpperCase()
    if (stripped.length <= 2 && singleChar in CODE_INDEX_MAP) {
      return CODE_INDEX_MAP[singleChar] % GROUP_COLOR_PALETTE.length
    }
  }

  // 2. Deterministic position in tournament's sorted group list (keeps renamed groups e.g. "مجموعة الأطلس" stable)
  const sorted = sortOrderedGroups(orderedGroups)
  if (groupId != null && sorted.length > 0) {
    const pos = sorted.findIndex((g) => g.id === groupId)
    if (pos >= 0) return pos % GROUP_COLOR_PALETTE.length
  }

  // 3. Fallback by name position inside orderedGroups
  if (rawName && sorted.length > 0) {
    const byName = sorted.findIndex(
      (g) => g.name === rawName || stripGroupPrefix(g.name) === stripped,
    )
    if (byName >= 0) return byName % GROUP_COLOR_PALETTE.length
  }

  // 4. Numeric groupId fallback when no ordered list is passed
  if (typeof groupId === 'number' && groupId > 0) {
    return (groupId - 1) % GROUP_COLOR_PALETTE.length
  }

  // 5. Stable string hash fallback for arbitrary custom names without IDs
  if (stripped) {
    let hash = 0
    for (let i = 0; i < stripped.length; i += 1) {
      hash = (hash * 31 + stripped.charCodeAt(i)) >>> 0
    }
    return hash % GROUP_COLOR_PALETTE.length
  }

  return -1
}

export function getGroupColor(groupOrKey, orderedGroups = []) {
  const index = resolveGroupColorIndex(groupOrKey, orderedGroups)
  if (index < 0) {
    return {
      ...NEUTRAL_GROUP_COLOR,
      index: -1,
      shortCode: '—',
      label: '',
    }
  }

  const paletteItem = GROUP_COLOR_PALETTE[index % GROUP_COLOR_PALETTE.length]
  const rawName =
    typeof groupOrKey === 'object'
      ? groupOrKey?.name ?? groupOrKey?.group_name ?? ''
      : typeof groupOrKey === 'string'
        ? groupOrKey
        : ''
  const groupId =
    typeof groupOrKey === 'object'
      ? groupOrKey?.id ?? groupOrKey?.group_id ?? groupOrKey?.key
      : undefined

  return {
    ...paletteItem,
    index,
    shortCode: extractGroupShortCode(rawName, index),
    label: formatGroupName(rawName, { groupId, emptyLabel: '' }),
  }
}
