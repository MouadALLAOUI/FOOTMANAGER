/**
 * Helper to compute and format all dates in a weekly subscription
 */
export function getWeeklySubscriptionDates(booking) {
  if (booking?.subscription_dates && Array.isArray(booking.subscription_dates) && booking.subscription_dates.length > 0) {
    return booking.subscription_dates
  }

  if (booking?.reservation_type !== 'weekly_subscription') {
    return []
  }

  const startDateStr = booking.start_date || booking.booking_date
  if (!startDateStr) return []

  const start = new Date(startDateStr + 'T00:00:00')
  if (isNaN(start.getTime())) return []

  const targetDow =
    booking.day_of_week !== undefined && booking.day_of_week !== null
      ? Number(booking.day_of_week)
      : start.getDay()

  const diff = (targetDow - start.getDay() + 7) % 7
  const cursor = new Date(start)
  cursor.setDate(start.getDate() + diff)

  let end
  if (booking.end_date) {
    end = new Date(booking.end_date + 'T00:00:00')
  } else {
    end = new Date(cursor)
    end.setDate(cursor.getDate() + 21) // 4 occurrences default
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const dates = []
  let weekNum = 1
  while (cursor <= end && dates.length < 52) {
    const y = cursor.getFullYear()
    const m = String(cursor.getMonth() + 1).padStart(2, '0')
    const d = String(cursor.getDate()).padStart(2, '0')
    const dStr = `${y}-${m}-${d}`

    dates.push({
      week_number: weekNum++,
      date: dStr,
      is_past: dStr < todayStr,
      is_today: dStr === todayStr,
      is_next: false,
    })
    cursor.setDate(cursor.getDate() + 7)
  }

  let nextFound = false
  for (const item of dates) {
    if (!nextFound && !item.is_past) {
      item.is_next = true
      nextFound = true
    }
  }

  return dates
}
