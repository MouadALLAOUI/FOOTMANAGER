export function timeAgo(dateStr, t, lang) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return t('common.now')
  if (mins < 60) return t('common.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return t('common.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('common.daysAgo', { count: days })
  try {
    const locale = lang?.startsWith('en') ? 'en' : 'ar-MA'
    return new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long' })
  } catch {
    return dateStr
  }
}

export function actionTarget(actionUrl) {
  if (!actionUrl) return null
  const map = {
    '/dashboard': '/',
    '/dashboard/bookings': '/dashboard/bookings',
    '/dashboard/my-reservations': '/dashboard/bookings',
    '/dashboard/matches': '/dashboard/matches',
    '/terrain/calendar': '/terrain/calendar',
    '/terrain/bookings': '/terrain/bookings',
    '/owner/bookings': '/terrain/bookings',
    '/player/applications': '/player/applications',
    '/admin': '/admin',
  }
  return map[actionUrl] || null
}
