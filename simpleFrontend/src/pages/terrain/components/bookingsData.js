import api from '../../../api/client'
import { queryClient } from '../../../api/queryClient'
import { q } from '../../../api/queries'

export function toWeekStart(d) {
  const x = new Date(d)
  const day = x.getDay()
  x.setDate(x.getDate() - (day === 0 ? 6 : day - 1))
  return x.toISOString().slice(0, 10)
}

export function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function fetchWeek(terrainId, weekStart, weeks = 1) {
  return queryClient.fetchQuery({
    queryKey: weeks > 1 ? q.ownerCalendar(terrainId, weekStart, weeks) : q.ownerCalendar(terrainId, weekStart),
    queryFn: () => api.get(`/owner/terrains/${terrainId}/calendar`, { params: { week_start: weekStart, weeks } }).then((r) => r.data),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

export function slotBookings(data) {
  const out = []
  for (const day of data?.days || []) {
    for (const slot of day.slots || []) {
      if (slot.status === 'booked' && slot.booking) {
        out.push({ ...slot.booking, date: day.date, day_name: day.day_name })
      }
    }
  }
  return out
}

export async function fetchAllPending(terrains) {
  const results = await Promise.all(
    terrains.map(async (t) => {
      try {
        const data = await fetchWeek(t.id, toWeekStart(new Date()))
        return (data.pending_bookings || []).map((b) => ({ ...b, terrain: { id: t.id, name: t.name } }))
      } catch {
        return []
      }
    }),
  )
  return results.flat()
}

export async function fetchUpcomingBookings(terrains, weeksAhead = 6) {
  const seen = new Set()
  const out = []
  const results = await Promise.all(
    terrains.map(async (t) => {
      try {
        const data = await fetchWeek(t.id, toWeekStart(new Date()), weeksAhead + 1)
        return slotBookings(data).map((b) => ({ ...b, terrain: { id: t.id, name: t.name } }))
      } catch {
        return []
      }
    }),
  )
  for (const list of results) {
    for (const b of list) {
      const key = `${b.id}|${b.date}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(b)
    }
  }
  return out.sort((a, b) => (a.date === b.date ? (a.start_time < b.start_time ? -1 : 1) : a.date < b.date ? -1 : 1))
}

function bucketLabel(key, mode) {
  if (mode === 'yearly') {
    const [y, m] = key.split('-').map(Number)
    return new Intl.DateTimeFormat('ar-MA', { month: 'short' }).format(new Date(y, m - 1, 1))
  }
  const opts = mode === 'weekly' ? { month: 'short', day: 'numeric' } : { day: 'numeric' }
  return new Intl.DateTimeFormat('ar-MA', opts).format(new Date(key + 'T00:00:00'))
}

export async function fetchOverviewAnalytics(mode) {
  const r = await api.get('/owner/analytics/overview', { params: { mode } })
  const series = (r.data.series || []).map((row) => ({
    label: bucketLabel(row.key, mode),
    'الإيرادات': Math.round(row.revenue),
    'الحجوزات': row.bookings,
  }))
  return {
    series,
    occupancy: r.data.occupancy ?? 0,
    counts: r.data.counts || {},
  }
}

export async function fetchTerrainBookings(terrains) {
  const [pending, upcoming] = await Promise.all([
    fetchAllPending(terrains),
    fetchUpcomingBookings(terrains, 6),
  ])
  return { pending, upcoming }
}
