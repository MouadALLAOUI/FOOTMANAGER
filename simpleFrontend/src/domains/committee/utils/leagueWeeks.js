// Helpers for computing and filtering league weeks

export function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay() // 0 = Sunday, 1 = Monday, ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function formatWeekDateRange(monday, lang = 'ar') {
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const isAr = Boolean(lang?.startsWith('ar'))
  const locale = isAr ? 'ar-MA' : 'en-GB'

  const startDay = monday.getDate()
  const endDay = sunday.getDate()

  const startMonth = new Intl.DateTimeFormat(locale, { month: isAr ? 'long' : 'short' }).format(monday)
  const endMonth = new Intl.DateTimeFormat(locale, { month: isAr ? 'long' : 'short' }).format(sunday)

  if (monday.getMonth() === sunday.getMonth()) {
    return `${startDay} - ${endDay} ${startMonth}`
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`
}

export function computeLeagueWeeks(fixtures, lang = 'ar') {
  if (!fixtures || fixtures.length === 0) {
    return { weeks: [], unscheduled: [], chronologicalNumberMap: new Map() }
  }

  const unscheduled = []
  const scheduled = []

  for (const f of fixtures) {
    if (f.scheduled_at && f.status !== 'waiting_for_booking') {
      scheduled.push(f)
    } else {
      unscheduled.push(f)
    }
  }

  // Sort all scheduled fixtures chronologically by scheduled_at, then id
  scheduled.sort((a, b) => {
    const diff = new Date(a.scheduled_at) - new Date(b.scheduled_at)
    if (diff !== 0) return diff
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
    const key = monday.toISOString().slice(0, 10)
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

  // 3. Last week
  return weeks[weeks.length - 1].id
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
      const d = new Date(`${dayKey}T12:00:00`)
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
    }
  })
}
