const pad = (n) => String(n).padStart(2, '0')

export function toMinutes(time) {
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return null
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(total) {
  const rem = ((total % 1440) + 1440) % 1440
  return `${pad(Math.floor(rem / 60))}:${pad(rem % 60)}`
}

export function addMinutes(time, minutes) {
  const t = toMinutes(time)
  if (t == null) return time
  return fromMinutes(t + minutes)
}

/**
 * Build a list of slot start times at `step`-minute intervals between (inclusive)
 * start and end. Defaults to the app-wide generic scheduling granularity of
 * 30 minutes (matching the existing slot-chip convention), unless a caller
 * provides a terrain-derived step (e.g. slot_duration_minutes).
 */
export function buildTimeSlots(start = '09:00', end = '23:00', step = 30) {
  const s = toMinutes(start)
  const e = toMinutes(end)
  if (s == null || e == null || step <= 0 || e < s) return []
  const out = []
  for (let t = s; t <= e; t += step) out.push(fromMinutes(t))
  return out
}
