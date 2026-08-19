const dayNameFormatter = new Intl.DateTimeFormat('ar-MA', { weekday: 'long' })
const dayFormatter = new Intl.DateTimeFormat('ar-MA', { day: 'numeric', month: 'long' })
const yearFormatter = new Intl.DateTimeFormat('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' })

// Helper to construct a safe Date object at noon (T12:00:00) to prevent DST/Timezone midnight rollbacks
function parseISODate(dateStr) {
  return new Date(`${dateStr}T12:00:00`)
}

function dayNameFor(dateStr) {
  try {
    return dayNameFormatter.format(parseISODate(dateStr))
  } catch {
    return ''
  }
}

function formatPeriodLabel(week) {
  if (!week?.start || !week?.end) return ''
  try {
    const start = dayFormatter.format(parseISODate(week.start))
    const end = yearFormatter.format(parseISODate(week.end))
    return `${start} — ${end}`
  } catch {
    return `${week.start} — ${week.end}`
  }
}

function buildDay(rawDay, today, selectedDate) {
  const date = parseISODate(rawDay.date)
  return {
    id: rawDay.date,
    date: rawDay.date,
    dayName: dayNameFor(rawDay.date),
    dayNumber: date.getDate(),
    isClosed: rawDay.is_open === false || rawDay.is_closed === true,
    isToday: rawDay.date === today,
    isSelected: rawDay.date === selectedDate,
  }
}

function enrichBooking(booking, rawDay, terrain) {
  return {
    ...booking,
    date: rawDay.date,
    booking_date: rawDay.date,
    day_name: rawDay.day_name,
    terrain: terrain || undefined,
  }
}

function adaptSlot(rawDay, raw, terrain, today) {
  const booking = raw.booking
  const isPending = booking?.status === 'pending'
  const status = raw.status === 'booked' ? (isPending ? 'pending' : 'booked') : (raw.status || 'available')

  return {
    id: `${rawDay.date}:${raw.start}`,
    date: rawDay.date,
    startTime: raw.start,
    endTime: raw.end,
    status,
    title: booking
      ? booking.guest_name || booking.team?.name || booking.manager?.name || 'حجز'
      : raw.status === 'closed'
        ? raw.closure?.reason || 'مغلق'
        : '',
    subtitle: booking ? (booking.guest_name ? 'ضيف' : 'حجز') : '',
    price: booking ? Number(booking.price || 0) : null,
    metadata: {
      bookingId: booking?.id ?? null,
      teamId: booking?.team?.id ?? null,
      teamName: booking?.team?.name ?? null,
      managerId: booking?.manager?.id ?? null,
      managerName: booking?.manager?.name ?? null,
      manager: booking?.manager ?? null,
      guestName: booking?.guest_name ?? null,
      guestPhone: booking?.guest_phone ?? null,
      guestEmail: booking?.guest_email ?? null,
      isGuest: booking?.is_guest === true || (Boolean(booking?.guest_name) && !booking?.manager),
      bookingStatus: booking?.status ?? null,
      bookingType: booking?.booking_type ?? null,
      reservationType: booking?.reservation_type ?? null,
      closureId: raw.closure?.id ?? null,
      closureReason: raw.closure?.reason ?? null,
      isPast: rawDay.date < today,
      rawBooking: booking ? enrichBooking(booking, rawDay, terrain) : null,
    },
  }
}

function buildEvent(rawDay, slot) {
  const booking = slot.metadata.rawBooking
  return {
    id: slot.metadata.bookingId ? `event:${rawDay.date}:${slot.metadata.bookingId}` : slot.id,
    date: rawDay.date,
    startTime: booking?.start_time || slot.startTime,
    endTime: booking?.end_time || slot.endTime,
    status: slot.status,
    title: slot.title,
    subtitle: slot.subtitle,
    price: slot.price,
    bookingType: slot.metadata.bookingType,
    reservationType: slot.metadata.reservationType,
    metadata: slot.metadata,
  }
}

function adaptPendingBooking(raw) {
  const manager = raw.manager || {}
  const team = raw.team || {}
  return {
    id: raw.id,
    date: raw.booking_date || raw.date || '',
    startTime: raw.start_time || '',
    endTime: raw.end_time || '',
    title: raw.guest_name || team.name || manager.name || 'فريق',
    subtitle: raw.guest_name ? 'ضيف' : manager.name || '',
    price: Number(raw.price || 0),
    status: 'pending',
    metadata: {
      bookingId: raw.id,
      teamId: team.id ?? null,
      managerId: manager.id ?? null,
      manager: manager || null,
      guestName: raw.guest_name || null,
      isGuest: raw.is_guest === true || Boolean(raw.guest_name),
      whatsappUrl: raw.whatsapp_notification_url || null,
      rawBooking: raw,
    },
  }
}

export function adaptTerrainCalendar(payload, { today = '', selectedDate = '' } = {}) {
  const rawDays = payload?.days || []
  const days = []
  const slots = []
  const eventsByDay = new Map()

  for (const rawDay of rawDays) {
    days.push(buildDay(rawDay, today, selectedDate))
    for (const rawSlot of rawDay.slots || []) {
      const slot = adaptSlot(rawDay, rawSlot, payload?.terrain, today)
      slots.push(slot)

      if (slot.status !== 'booked' && slot.status !== 'pending') continue

      const key = slot.metadata.bookingId
        ? `${rawDay.date}:${slot.metadata.bookingId}`
        : `${rawDay.date}:${slot.id}`

      if (!eventsByDay.has(key)) {
        eventsByDay.set(key, buildEvent(rawDay, slot))
      }
    }
  }

  return {
    terrain: payload?.terrain || null,
    week: payload?.week || null,
    periodLabel: formatPeriodLabel(payload?.week),
    stats: payload?.stats || {},
    days,
    slots,
    events: Array.from(eventsByDay.values()),
    pendingBookings: (payload?.pending_bookings || []).map(adaptPendingBooking),
  }
}