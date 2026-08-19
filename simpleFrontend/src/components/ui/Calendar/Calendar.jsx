import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CalendarHeader from './CalendarHeader'
import CalendarGrid from './CalendarGrid'
import CalendarSkeleton from './CalendarSkeleton'

const NARROW_BREAKPOINT = 640

const dayLabelFormatter = new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' })

const AVAILABLE_HEIGHT = {
  '--calendar-available-height': 'calc(100dvh - 7.5rem)',
}

function shiftISODate(iso, delta) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + delta)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatDayLabel(iso) {
  try {
    return dayLabelFormatter.format(new Date(iso + 'T00:00:00'))
  } catch {
    return iso || ''
  }
}

export default function Calendar({
  days = [],
  slots = [],
  events = [],
  loading = false,
  title = '',
  periodLabel = '',
  selectedDate = '',
  onPrevious,
  onNext,
  onToday,
  onDaySelect,
  onSlotClick,
  onEventClick,
}) {
  const { t } = useTranslation()
  const cardRef = useRef(null)
  const [view, setView] = useState('week')
  const [narrow, setNarrow] = useState(false)

  const isDay = narrow || view === 'day'
  const activeDate = selectedDate || days[0]?.date || ''

  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const update = () => setNarrow(el.getBoundingClientRect().width < NARROW_BREAKPOINT)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const visible = useMemo(() => {
    if (!isDay) return { days, slots, events }
    return {
      days: days.filter((d) => d.date === activeDate),
      slots: slots.filter((s) => s.date === activeDate),
      events: events.filter((e) => e.date === activeDate),
    }
  }, [isDay, activeDate, days, slots, events])

  const handleNavigate = (dir) => {
    if (!isDay) {
      if (dir < 0) onPrevious?.()
      else onNext?.()
      return
    }
    if (activeDate) onDaySelect?.(shiftISODate(activeDate, dir))
  }

  if (loading) return <CalendarSkeleton />

  return (
    <div
      ref={cardRef}
      className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      style={{ ...AVAILABLE_HEIGHT, height: 'var(--calendar-available-height)' }}
    >
      <div className="shrink-0">
        <CalendarHeader
          title={title}
          periodLabel={isDay ? formatDayLabel(activeDate) : periodLabel}
          view={isDay ? 'day' : 'week'}
          onViewChange={setView}
          weekDisabled={narrow}
          dateValue={activeDate}
          onDateChange={(iso) => onDaySelect?.(iso)}
          onPrevious={() => handleNavigate(-1)}
          onNext={() => handleNavigate(1)}
          onToday={onToday}
        />
      </div>

      <CalendarGrid
        days={visible.days}
        slots={visible.slots}
        events={visible.events}
        onDaySelect={onDaySelect}
        onSlotClick={onSlotClick}
        onEventClick={onEventClick}
      />

      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 px-4 py-2.5">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className="size-3.5 rounded bg-gradient-to-br from-emerald-500 to-emerald-600" />
          {t('terrain.calendar.booked')}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className="size-3.5 rounded bg-gradient-to-br from-amber-400 to-amber-500" />
          {t('terrain.calendar.pending')}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className="relative size-3.5 overflow-hidden rounded bg-gradient-to-br from-slate-400 to-slate-500">
            <span
              aria-hidden
              className="absolute inset-0"
              style={{ background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 8px)' }}
            />
          </span>
          {t('terrain.calendar.subscription')}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className="size-3.5 rounded border border-dashed border-slate-300 bg-slate-100" />
          {t('terrain.calendar.closed')}
        </span>
      </div>
    </div>
  )
}
