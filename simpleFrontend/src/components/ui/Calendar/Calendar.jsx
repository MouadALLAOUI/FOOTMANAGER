import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Lock, Plus, Repeat } from 'lucide-react'
import CalendarHeader from './CalendarHeader'
import CalendarGrid from './CalendarGrid'
import CalendarSkeleton from './CalendarSkeleton'

const NARROW_BREAKPOINT = 768

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

  // Mobile selected day slots & events
  const mobileSlots = useMemo(() => {
    return slots
      .filter((s) => s.date === activeDate)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
  }, [slots, activeDate])

  const mobileEvents = useMemo(() => {
    return events.filter((e) => e.date === activeDate)
  }, [events, activeDate])

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
      className="flex min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs"
      style={{ ...AVAILABLE_HEIGHT, height: 'var(--calendar-available-height)' }}
    >
      {/* Calendar Header Controls */}
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

      {/* MOBILE VIEW (< md): Horizontal Day Selector Strip + Vertical Single-Day Timeline */}
      <div className="flex md:hidden flex-1 min-h-0 flex-col overflow-hidden">
        {/* Horizontal Date Selector Strip */}
        <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 p-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 min-w-max">
            {days.map((d) => {
              const isSelected = d.date === activeDate
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onDaySelect?.(d.date)}
                  className={`flex flex-col items-center justify-center px-3 py-2 rounded-2xl min-w-[58px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                      : d.isToday
                        ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
                        : 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-white/80' : d.isToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {d.dayName}
                  </span>
                  <span className="text-sm font-black mt-0.5">
                    {d.dayNumber}
                  </span>
                  {d.isToday && !isSelected && (
                    <span className="size-1.5 rounded-full bg-emerald-500 mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Day Header Label */}
        <div className="shrink-0 px-4 py-2 border-b border-slate-100 bg-white flex items-center justify-between">
          <p className="text-xs font-black text-slate-800">{formatDayLabel(activeDate)}</p>
          <span className="text-[10px] font-bold text-slate-400">{mobileSlots.length} مواعيد</span>
        </div>

        {/* Thumb-Friendly Slot Cards List (Vertical single column w-full) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {mobileSlots.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400">
              لا توجد مواعيد متاحة في هذا اليوم
            </div>
          ) : (
            mobileSlots.map((slot) => {
              const event = mobileEvents.find(
                (e) => e.startTime === slot.startTime || (e.startTime <= slot.startTime && e.endTime > slot.startTime),
              )

              // CASE 1: Booked / Pending / Subscription Event
              if (event) {
                const isPending = event.status === 'pending'
                const isSub = event.reservationType === 'weekly_subscription'

                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onEventClick?.(event)}
                    className={`w-full min-h-[56px] rounded-2xl border p-3 flex items-center justify-between text-start transition-all active:scale-[0.99] cursor-pointer shadow-2xs ${
                      isPending
                        ? 'border-amber-300 bg-gradient-to-l from-amber-50/80 to-white hover:border-amber-400'
                        : isSub
                          ? 'border-violet-300 bg-gradient-to-l from-violet-50/80 to-white hover:border-violet-400'
                          : 'border-emerald-300/80 bg-gradient-to-l from-emerald-50/80 to-white hover:border-emerald-500'
                    }`}
                  >
                    {/* Time in Bold */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`grid size-9 place-items-center rounded-xl font-black text-xs tracking-tight text-white shadow-2xs ${
                          isPending ? 'bg-amber-500' : isSub ? 'bg-violet-600' : 'bg-emerald-600'
                        }`}
                      >
                        {event.startTime}
                      </span>
                      <div className="text-[10px] text-slate-400 font-bold leading-tight">
                        إلى<br /><span className="text-slate-700 font-black">{event.endTime}</span>
                      </div>
                    </div>

                    {/* Booking Details */}
                    <div className="min-w-0 flex-1 px-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs sm:text-sm font-black text-slate-900 truncate">{event.title}</p>
                        {isSub && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-violet-100 px-1.5 py-0.5 text-[8.5px] font-black text-violet-700">
                            <Repeat className="size-2.5" /> دوري
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[10px] font-bold flex items-center gap-1 mt-0.5 ${
                          isPending ? 'text-amber-700' : isSub ? 'text-violet-700' : 'text-emerald-700'
                        }`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            isPending ? 'bg-amber-500 animate-pulse' : isSub ? 'bg-violet-500' : 'bg-emerald-500'
                          }`}
                        />
                        {isPending
                          ? t('terrain.calendar.pending', 'معلق بانتظار التأكيد')
                          : isSub
                            ? t('terrain.calendar.subscription', 'اشتراك أسبوعي')
                            : t('terrain.calendar.booked', 'حجز مؤكد')}
                      </p>
                    </div>

                    {/* Price Tag & Chevron */}
                    <div className="shrink-0 flex items-center gap-2">
                      {event.price != null && (
                        <span className="text-xs font-black text-slate-800 bg-white border border-slate-200/80 px-2 py-1 rounded-xl shadow-2xs">
                          {Number(event.price).toLocaleString('ar-MA')} <span className="text-[9px] text-slate-400">د.م</span>
                        </span>
                      )}
                      <ChevronLeft className="size-4 text-slate-400 ltr:rotate-180" />
                    </div>
                  </button>
                )
              }

              // CASE 2: Closed Slot
              if (slot.status === 'closed') {
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => onSlotClick?.(slot)}
                    className="w-full min-h-[52px] rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 flex items-center justify-between text-start transition-all hover:bg-slate-100/70 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="grid size-9 place-items-center rounded-xl bg-slate-200 text-slate-600 font-black text-xs tracking-tight">
                        {slot.startTime}
                      </span>
                      <div className="text-[10px] text-slate-400 font-bold leading-tight">
                        إلى<br /><span className="text-slate-500 font-bold">{slot.endTime}</span>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 px-3 flex items-center gap-2">
                      <Lock className="size-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-500 truncate">
                        {slot.metadata?.closureReason ? `مغلق: ${slot.metadata.closureReason}` : t('terrain.calendar.closed', 'مغلق')}
                      </span>
                    </div>

                    <span className="text-[11px] font-bold text-slate-400 shrink-0">تعديل</span>
                  </button>
                )
              }

              // CASE 3: Past Slot
              const isPast = slot.metadata?.isPast
              if (isPast) {
                return (
                  <div
                    key={slot.id}
                    className="w-full min-h-[52px] rounded-2xl border border-slate-100 bg-slate-50/40 p-3 flex items-center justify-between text-start opacity-60 select-none"
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-400 font-bold text-xs tracking-tight">
                        {slot.startTime}
                      </span>
                      <span className="text-xs text-slate-400 font-bold">{slot.endTime}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-400">انتهى هذا الموعد</span>
                    <span className="text-[10px] font-bold text-slate-300">منتهي</span>
                  </div>
                )
              }

              // CASE 4: Available Slot
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => onSlotClick?.(slot)}
                  className="group w-full min-h-[56px] rounded-2xl border border-emerald-200/90 bg-white hover:bg-emerald-50/40 p-3 flex items-center justify-between text-start transition-all hover:border-emerald-400 hover:shadow-xs active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="grid size-9 place-items-center rounded-xl bg-slate-100 group-hover:bg-emerald-100 text-slate-800 group-hover:text-emerald-800 font-black text-xs tracking-tight transition-colors">
                      {slot.startTime}
                    </span>
                    <div className="text-[10px] text-slate-400 font-bold leading-tight">
                      إلى<br /><span className="text-slate-600 font-bold">{slot.endTime}</span>
                    </div>
                  </div>

                  <div className="min-w-0 flex-1 px-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-600">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      {t('terrain.calendar.available', 'متاح للحجز')}
                    </span>
                  </div>

                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 border border-emerald-200/70 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs">
                      <Plus className="size-3.5" />
                      <span>حجز</span>
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* DESKTOP VIEW (>= md): Google Calendar Multi-Column Grid */}
      <div className="hidden md:flex flex-1 min-h-0 flex-col overflow-hidden">
        <CalendarGrid
          days={visible.days}
          slots={visible.slots}
          events={visible.events}
          onDaySelect={onDaySelect}
          onSlotClick={onSlotClick}
          onEventClick={onEventClick}
        />
      </div>

      {/* Legend Footer */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 px-4 py-2.5 bg-slate-50/30">
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className="size-3 rounded bg-gradient-to-br from-emerald-500 to-emerald-600" />
          {t('terrain.calendar.booked', 'حجز مؤكد')}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className="size-3 rounded bg-gradient-to-br from-amber-400 to-amber-500" />
          {t('terrain.calendar.pending', 'حجز معلق')}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className="size-3 rounded bg-gradient-to-br from-violet-500 to-purple-600" />
          {t('terrain.calendar.subscription', 'اشتراك دوري')}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span className="size-3 rounded border border-dashed border-slate-300 bg-slate-100" />
          {t('terrain.calendar.closed', 'مغلق')}
        </span>
      </div>
    </div>
  )
}
