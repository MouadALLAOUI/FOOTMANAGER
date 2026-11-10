const ARABIC_SHORT_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'ماي',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export function parseDayKeyMeta(dateKey, dayIndex = 0) {
  if (!dateKey || dateKey === 'unscheduled') {
    return {
      dayTitle: 'بدون موعد',
      shortDate: 'بانتظار البرمجة',
      weekday: '',
      fullLabel: 'مباريات بانتظار تحديد الموعد',
    }
  }
  try {
    const d = new Date(`${dateKey}T12:00:00`)
    if (Number.isNaN(d.getTime())) {
      return {
        dayTitle: `اليوم ${dayIndex + 1}`,
        shortDate: dateKey,
        weekday: '',
        fullLabel: `اليوم ${dayIndex + 1} – ${dateKey}`,
      }
    }
    const weekday = ARABIC_WEEKDAYS[d.getDay()] || ''
    const dayNum = d.getDate()
    const monthName = ARABIC_SHORT_MONTHS[d.getMonth()] || ''
    return {
      dayTitle: `اليوم ${dayIndex + 1}`,
      shortDate: `${dayNum} ${monthName}`,
      weekday,
      fullLabel: `${weekday} ${dayNum} ${monthName} ${d.getFullYear()}`,
    }
  } catch {
    return {
      dayTitle: `اليوم ${dayIndex + 1}`,
      shortDate: dateKey,
      weekday: '',
      fullLabel: dateKey,
    }
  }
}
