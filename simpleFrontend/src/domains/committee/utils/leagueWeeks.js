// League Weeks Calculation Utilities
// Designed for reliable week computation without timezone shifting

export function formatLocalDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getMondayOfWeek(dateInput) {
  let d
  if (typeof dateInput === 'string') {
    const clean = dateInput.includes('T') ? dateInput : `${dateInput.split(' ')[0]}T12:00:00`
    d = new Date(clean)
  } else {
    d = new Date(dateInput)
  }

  // Adjust to Monday: 0 (Sun) -> -6, 1 (Mon) -> 0, 2 (Tue) -> -1, etc.
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function formatWeekDateRange(monday, lang = 'ar') {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const isAr = Boolean(lang?.startsWith('ar'))
  const locale = isAr ? 'ar-MA' : 'en-GB'

  const startDay = monday.getDate()
  const endDay = sunday.getDate()
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(sunday)

  if (monday.getMonth() === sunday.getMonth()) {
    return isAr ? `${startDay}–${endDay} ${monthName}` : `${startDay}–${endDay} ${monthName}`
  }

  const startMonthName = new Intl.DateTimeFormat(locale, { month: isAr ? 'long' : 'short' }).format(monday)
  return isAr ? `${startDay} ${startMonthName} – ${endDay} ${monthName}` : `${startDay} ${startMonthName} – ${endDay} ${monthName}`
}

export function computeLeagueWeeks(fixtures = [], lang = 'ar') {
  const scheduled = []
  const unscheduled = []

  for (const f of fixtures) {
    if (f.scheduled_at && f.status !== 'waiting_for_booking') {
      scheduled.push(f)
    } else {
      unscheduled.push(f)
    }
  }

  // Sort all scheduled fixtures chronologically by scheduled_at, then id
  scheduled.sort((a, b) => {
    const diff = new Date((a.scheduled_at || '').replace(' ', 'T')) - new Date((b.scheduled_at || '').replace(' ', 'T'))
    if (!isNaN(diff) && diff !== 0) return diff
    return (a.id || 0) - (b.id || 0)
  })

  // Map each fixture to its overall chronological match number
  const chronologicalNumberMap = new Map()
  scheduled.forEach((f, index) => {
    chronologicalNumberMap.set(f.id, index + 1)
  })
  unscheduled.forEach((f, index) => {
    chronologicalNumberMap.set(f.id, scheduled.length + index + 1)
  })

  // Group scheduled into Monday-to-Sunday weeks
  const weekMap = new Map()
  for (const f of scheduled) {
    const monday = getMondayOfWeek(f.scheduled_at)
    const key = formatLocalDateKey(monday)
    if (!weekMap.has(key)) {
      weekMap.set(key, { monday, fixtures: [] })
    }
    weekMap.get(key).fixtures.push(f)
  }

  const isAr = Boolean(lang?.startsWith('ar'))
  const sortedKeys = [...weekMap.keys()].sort()

  const weeks = sortedKeys.map((key, index) => {
    const data = weekMap.get(key)
    const sunday = new Date(data.monday)
    sunday.setDate(data.monday.getDate() + 6)
    sunday.setHours(23, 59, 59, 999)
    const number = index + 1
    const dateRange = formatWeekDateRange(data.monday, lang)
    const label = isAr ? `الأسبوع ${number}` : `Week ${number}`

    return {
      id: key,
      number,
      label,
      dateRange,
      fullLabel: `${label} · ${dateRange}`,
      monday: data.monday,
      sunday,
      fixtures: data.fixtures,
      count: data.fixtures.length,
    }
  })

  return { weeks, unscheduled, scheduled, chronologicalNumberMap }
}

export function getDefaultWeekId(weeks, unscheduled = []) {
  if (!weeks || weeks.length === 0) {
    return 'unscheduled'
  }
  const now = new Date()

  // 1. Current week (contains today)
  const currentWeek = weeks.find((w) => now >= w.monday && now <= w.sunday)
  if (currentWeek) return currentWeek.id

  // 2. First upcoming week
  const upcomingWeek = weeks.find((w) => w.sunday >= now)
  if (upcomingWeek) return upcomingWeek.id

  // 3. If tournament is in the past, return the first week or nearest
  return weeks[0]?.id || weeks[weeks.length - 1].id
}

/**
 * Returns distinctive color configuration for match days
 * Friday: Blue (#1769FF)
 * Saturday: Green (#00A84F)
 * Sunday: Orange (#FF7900)
 */
export function getDayColorConfig(dayKey) {
  if (!dayKey || dayKey === 'unscheduled') {
    return {
      dayIndex: -1,
      name: 'غير محدد',
      primary: '#64748B',
      headerBg: 'bg-[#64748B]',
      headerPillBg: '#475569',
      cardTint: '#F8FAFC',
      accentColor: '#64748B',
      borderColor: '#E2E8F0',
    }
  }

  const clean = dayKey.includes('T') ? dayKey : `${dayKey}T12:00:00`
  const d = new Date(clean)
  const day = d.getDay() // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat

  switch (day) {
    case 5: // Friday (الجمعة) - BLUE
      return {
        dayIndex: 5,
        name: 'الجمعة',
        primary: '#1769FF',
        headerBg: 'bg-[#1769FF]',
        headerPillBg: '#0F52CC',
        cardTint: '#EBF3FF',
        accentColor: '#1769FF',
        borderColor: '#C7DCFE',
      }
    case 6: // Saturday (السبت) - GREEN
      return {
        dayIndex: 6,
        name: 'السبت',
        primary: '#00A84F',
        headerBg: 'bg-[#00A84F]',
        headerPillBg: '#007A38',
        cardTint: '#E6F7ED',
        accentColor: '#00A84F',
        borderColor: '#A7F3D0',
      }
    case 0: // Sunday (الأحد) - ORANGE
      return {
        dayIndex: 0,
        name: 'الأحد',
        primary: '#FF7900',
        headerBg: 'bg-[#FF7900]',
        headerPillBg: '#C85E00',
        cardTint: '#FFF4E6',
        accentColor: '#FF7900',
        borderColor: '#FED7AA',
      }
    case 4: // Thursday (الخميس) - PURPLE
      return {
        dayIndex: 4,
        name: 'الخميس',
        primary: '#7C3AED',
        headerBg: 'bg-[#7C3AED]',
        headerPillBg: '#5B21B6',
        cardTint: '#F5F3FF',
        accentColor: '#7C3AED',
        borderColor: '#DDD6FE',
      }
    case 3: // Wednesday (الأربعاء) - TEAL
      return {
        dayIndex: 3,
        name: 'الأربعاء',
        primary: '#0D9488',
        headerBg: 'bg-[#0D9488]',
        headerPillBg: '#0F766E',
        cardTint: '#F0FDFA',
        accentColor: '#0D9488',
        borderColor: '#99F6E4',
      }
    case 2: // Tuesday (الثلاثاء) - SKY BLUE
      return {
        dayIndex: 2,
        name: 'الثلاثاء',
        primary: '#0284C7',
        headerBg: 'bg-[#0284C7]',
        headerPillBg: '#0369A1',
        cardTint: '#F0F9FF',
        accentColor: '#0284C7',
        borderColor: '#BAE6FD',
      }
    case 1: // Monday (الإثنين) - INDIGO
    default:
      return {
        dayIndex: 1,
        name: 'الإثنين',
        primary: '#4F46E5',
        headerBg: 'bg-[#4F46E5]',
        headerPillBg: '#3730A3',
        cardTint: '#EEF2FF',
        accentColor: '#4F46E5',
        borderColor: '#C7D2FE',
      }
  }
}

export function groupFixturesByDay(fixtures, lang = 'ar') {
  const isAr = Boolean(lang?.startsWith('ar'))
  const locale = isAr ? 'ar-MA' : 'en-GB'

  const dayMap = new Map()
  for (const f of fixtures) {
    const key = f.scheduled_at ? f.scheduled_at.slice(0, 10) : 'unscheduled'
    if (!dayMap.has(key)) dayMap.set(key, [])
    dayMap.get(key).push(f)
  }

  const sortedKeys = [...dayMap.keys()].sort()
  return sortedKeys.map((dayKey) => {
    const dayMatches = dayMap.get(dayKey).slice().sort((a, b) => {
      const timeA = a.scheduled_at ? a.scheduled_at.slice(11, 16) : '00:00'
      const timeB = b.scheduled_at ? b.scheduled_at.slice(11, 16) : '00:00'
      return timeA.localeCompare(timeB)
    })

    let headerLabel = ''
    if (dayKey === 'unscheduled') {
      headerLabel = isAr ? 'مباريات بانتظار تحديد الموعد' : 'Unscheduled Matches'
    } else {
      const clean = dayKey.includes('T') ? dayKey : `${dayKey}T12:00:00`
      const d = new Date(clean)
      headerLabel = new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: isAr ? 'long' : 'short',
        year: 'numeric',
      }).format(d)
    }

    return {
      dayKey,
      headerLabel,
      matches: dayMatches,
      dayConfig: getDayColorConfig(dayKey),
    }
  })
}
