const LEVEL_KEYS = ['beginner', 'intermediate', 'good', 'veryGood', 'excellent']

export function cityFilterValue(city, t) {
  if (!city) return null
  const label = t(`landing.hero.cities.${city}`)
  return label && label !== `landing.hero.cities.${city}` ? label : city
}

export function mapLevel(level) {
  return LEVEL_KEYS.includes(level) ? level : 'good'
}

export function formatCount(n, lang) {
  return Number(n || 0).toLocaleString(lang.startsWith('ar') ? 'ar-MA' : 'en-GB')
}

export function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function matchDay(iso, lang) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  if (d.toDateString() === now.toDateString()) return lang.startsWith('ar') ? 'اليوم' : 'Today'
  if (d.toDateString() === tomorrow.toDateString()) return lang.startsWith('ar') ? 'غداً' : 'Tomorrow'
  return new Intl.DateTimeFormat(lang.startsWith('ar') ? 'ar-MA' : 'en-GB', { weekday: 'long' }).format(d)
}

export function relativeTime(iso, lang) {
  if (!iso) return ''
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  const rtf = new Intl.RelativeTimeFormat(lang.startsWith('ar') ? 'ar' : 'en', { numeric: 'auto' })
  if (Math.abs(diffMin) < 60) return rtf.format(-diffMin, 'minute')
  if (Math.abs(diffMin) < 24 * 60) return rtf.format(-Math.round(diffMin / 60), 'hour')
  return rtf.format(-Math.round(diffMin / 1440), 'day')
}

export function fieldImage(stadium) {
  return (
    stadium?.cover_thumbnail_url ||
    stadium?.images?.[0]?.thumbnail_url ||
    stadium?.cover_image_url ||
    stadium?.images?.[0] ||
    '/backgrounds/fields/field-1.jpg'
  )
}

const FORMAT_FALLBACK = '5v5'

const CHIP_KEYS = ['5v5', '7v7', '11v11', 'salle', 'synthetic', 'cement', 'minifoot', 'grass', 'turf', 'parking', 'lights']

function stadiumChips(s) {
  const chips = []
  if (s?.player_format && CHIP_KEYS.includes(s.player_format)) chips.push(s.player_format)
  if (s?.type && CHIP_KEYS.includes(s.type)) chips.push(s.type)
  return chips.slice(0, 4)
}

function stadiumFormat(stadium, hostTeam) {
  return stadium?.player_format || hostTeam?.preferred_formats?.[0] || FORMAT_FALLBACK
}

export function toStadiumCard(s) {
  return {
    id: s.id,
    name: s.name,
    image: fieldImage(s),
    rating: s.rating != null ? s.rating.toFixed(1) : '—',
    reviews: s.reviews_count ?? 0,
    location: s.city || '',
    city: s.city || '',
    address: s.address || '',
    isOpen: Boolean(s.is_open),
    price: s.price_per_hour ?? s.price_per_team ?? s.total_price ?? 0,
    type: s.player_format || FORMAT_FALLBACK,
    format: s.player_format || FORMAT_FALLBACK,
    cover: s.is_covered ? 'covered' : 'open',
    distance: s.distance ?? null,
    chips: stadiumChips(s),
  }
}

export function toMatchCard(m) {
  const host = m.host_team || {}
  return {
    id: m.id,
    teamId: host.id,
    team: host.name || '—',
    level: mapLevel(host.level),
    city: m.stadium?.city || host.city || '',
    time: formatTime(m.match_datetime),
    day: m.match_datetime,
    published: m.match_datetime,
    players: host.member_count || host.max_squad_size || 11,
    stadium: m.stadium?.name || m.custom_terrain_name || '',
    format: stadiumFormat(m.stadium, host),
  }
}

export function toLiveMatchCard(m) {
  const host = m.host_team || {}
  return {
    id: m.id,
    home: host.name || '—',
    away: m.opponent_team?.name || '—',
    homeScore: 0,
    awayScore: 0,
    minute: m.minute ?? 0,
    city: m.stadium?.city || host.city || '',
    stadium: m.stadium?.name || m.custom_terrain_name || '',
    format: stadiumFormat(m.stadium, host),
    image: host.cover_image_url || fieldImage(m.stadium || null) || '/backgrounds/fields/field-1.jpg',
  }
}

export function toTeamCard(m) {
  const host = m.host_team || {}
  return {
    id: m.id,
    teamId: host.id,
    name: host.name || '—',
    level: mapLevel(host.level),
    city: m.stadium?.city || host.city || '',
    day: m.match_datetime,
    time: formatTime(m.match_datetime),
    format: stadiumFormat(m.stadium, host),
  }
}

export function toLeaderboardRow(r) {
  return {
    id: r.rank ?? r.id,
    team_id: r.id,
    name: r.name || '—',
    city: r.city || '',
    logo_url: r.logo_url || '',
    played: r.matches_played ?? 0,
    wins: r.wins ?? 0,
    goals: r.goals_for ?? 0,
    points: r.points ?? 0,
  }
}
