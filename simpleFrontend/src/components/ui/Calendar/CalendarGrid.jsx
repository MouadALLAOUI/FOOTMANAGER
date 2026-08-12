import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import CalendarDay from './CalendarDay'
import CalendarSlot from './CalendarSlot'
import CalendarEvent from './CalendarEvent'

const TIME_COLUMN = '3.5rem'
const DAY_COLUMN = 'minmax(0, 1fr)'
const MIN_HEIGHT = 16

function toMinutes(time = '') {
  const [h, m] = String(time).split(':')
  return (Number(h) || 0) * 60 + (Number(m) || 0)
}

function buildTimeline(slots = []) {
  let start = Infinity
  let end = -Infinity
  for (const slot of slots) {
    const s = toMinutes(slot?.startTime)
    const e = toMinutes(slot?.endTime)
    if (s < start) start = s
    if (e > end) end = e
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    start = 9 * 60
    end = 18 * 60
  }
  return {
    startMinutes: Math.floor(start / 60) * 60,
    endMinutes: Math.ceil(end / 60) * 60,
  }
}

function hourMarks(startMinutes, endMinutes) {
  const marks = []
  for (let m = startMinutes; m <= endMinutes; m += 60) marks.push(m)
  return marks
}

function formatHour(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function CalendarGrid({ days, slots = [], events = [], onDaySelect, onSlotClick, onEventClick }) {
  const bodyRef = useRef(null)
  const [bodyHeight, setBodyHeight] = useState(0)

  const timeline = useMemo(() => buildTimeline(slots), [slots])
  const marks = useMemo(() => hourMarks(timeline.startMinutes, timeline.endMinutes), [timeline])
  const slotsByDate = useMemo(() => groupByDate(slots), [slots])
  const eventsByDate = useMemo(() => groupByDate(events), [events])

  const slotCount = Math.max(marks.length - 1, 1)
  const hourHeight = bodyHeight > 0 ? bodyHeight / slotCount : 0

  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const update = () => setBodyHeight(el.getBoundingClientRect().height)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const toPx = (minutes) => ((minutes - timeline.startMinutes) / 60) * hourHeight
  const fitHeight = (h) => Math.max(h, Math.min(MIN_HEIGHT, hourHeight))
  const gridTemplate = `${TIME_COLUMN} repeat(${Math.max(days.length, 1)}, ${DAY_COLUMN})`

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0" style={{ gridTemplateColumns: gridTemplate }}>
        <div className="border-b border-slate-100 bg-white" />
        {days.map((day) => (
          <CalendarDay key={day.id} day={day} onSelect={onDaySelect} />
        ))}
      </div>

      <div ref={bodyRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: gridTemplate }}>
          <div className="relative bg-white">
            {marks.map((m) => (
              <div key={m} className="absolute inset-x-0" style={{ top: toPx(m), height: hourHeight }}>
                {m < timeline.endMinutes && (
                  <span className="absolute end-1 top-0 -translate-y-1/2 bg-white px-1 text-[9px] font-bold text-slate-400">
                    {formatHour(m)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const daySlots = slotsByDate[day.date] || []
            const dayEvents = eventsByDate[day.date] || []
            return (
              <div key={day.id} className="relative border-s border-slate-100">
                {marks.map((m) => (
                  <div key={m} className="absolute inset-x-0 border-t border-slate-100/80" style={{ top: toPx(m) }} />
                ))}
                {daySlots
                  .filter((s) => s.status === 'available' || s.status === 'closed')
                  .map((slot) => (
                    <CalendarSlot
                      key={slot.id}
                      slot={slot}
                      top={toPx(toMinutes(slot.startTime))}
                      height={fitHeight(toPx(toMinutes(slot.endTime)) - toPx(toMinutes(slot.startTime)))}
                      onClick={() => onSlotClick?.(slot)}
                    />
                  ))}
                {dayEvents.map((event) => (
                  <CalendarEvent
                    key={event.id}
                    event={event}
                    top={toPx(toMinutes(event.startTime))}
                    height={fitHeight(toPx(toMinutes(event.endTime)) - toPx(toMinutes(event.startTime)))}
                    onClick={() => onEventClick?.(event)}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function groupByDate(items) {
  const map = {}
  for (const item of items) {
    ;(map[item.date] ||= []).push(item)
  }
  return map
}
