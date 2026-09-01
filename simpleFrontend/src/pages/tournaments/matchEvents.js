const PERIOD_ORDER = {
  warmup: 0,
  kickoff: 0,
  first_half: 1,
  half_time: 2,
  second_half: 3,
  extra_time: 4,
  penalties: 5,
  match_end: 6,
  ended: 7,
}

export function sortMatchEvents(events = []) {
  return [...events].sort((a, b) => {
    const pa = PERIOD_ORDER[a.period] ?? 0
    const pb = PERIOD_ORDER[b.period] ?? 0
    if (pa !== pb) return pa - pb
    const ma = a.minute ?? 0
    const mb = b.minute ?? 0
    if (ma !== mb) return ma - mb
    return (a.id ?? 0) - (b.id ?? 0)
  })
}

export function minuteText(event) {
  if (event.minute == null) return ''
  return `${event.minute}${event.added_time ? `+${event.added_time}` : ''}'`
}

export function sideOf(event, home, away) {
  const homeId = home?.id ?? home
  const awayId = away?.id ?? away
  if (homeId != null && event.team_id === homeId) return 'home'
  if (awayId != null && event.team_id === awayId) return 'away'
  return 'neutral'
}

export function eventText(event) {
  return event.description || [event.player_name, event.team_name].filter(Boolean).join(' • ') || ''
}