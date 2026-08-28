export function formatTournamentDateRange(start, end, lang) {
  const locale = lang?.startsWith('ar') ? 'ar-MA' : 'en-GB'
  const opts = { day: 'numeric', month: 'short', year: 'numeric' }
  const fmt = (d) => (d ? new Intl.DateTimeFormat(locale, opts).format(new Date(d)) : null)
  const s = fmt(start)
  const e = fmt(end)
  if (!s && !e) return ''
  if (!e || s === e) return s
  return `${s} – ${e}`
}

export function coverStyle(tour) {
  return {
    background: `linear-gradient(135deg, ${tour.primary_color || '#16a34a'}, ${tour.secondary_color || '#0f172a'})`,
  }
}