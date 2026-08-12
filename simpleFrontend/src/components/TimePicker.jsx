import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faClock } from '@fortawesome/free-solid-svg-icons'

const ITEM_HEIGHT = 38
const VISIBLE = 3
const COLUMN_HEIGHT = ITEM_HEIGHT * VISIBLE

const pad = (n) => String(n).padStart(2, '0')
const toMinutes = (str) => {
  if (!str || !/^\d{2}:\d{2}$/.test(str)) return null
  const [h, m] = str.split(':').map(Number)
  return h * 60 + m
}
const toTime = (total) => `${pad(Math.floor(total / 60))}:${pad(total % 60)}`

const sizeStyles = {
  sm: 'py-2',
  md: 'py-3',
  lg: 'py-4',
}

function Wheel({ items, value, onChange, theme }) {
  const ref = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    let index = items.indexOf(value)
    if (index < 0) index = Math.max(0, items.length - 1)
    ref.current?.scrollTo({ top: index * ITEM_HEIGHT })
  }, [items, value])

  const handleScroll = () => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const index = Math.min(Math.max(Math.round(el.scrollTop / ITEM_HEIGHT), 0), items.length - 1)
      if (items[index] !== value) onChange(items[index])
    }, 60)
  }

  return (
    <div className="relative flex-1 overflow-hidden" style={{ height: COLUMN_HEIGHT }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            theme === 'dark'
              ? 'linear-gradient(to bottom, rgba(30,41,59,1) 0%, rgba(30,41,59,0) 25%, rgba(30,41,59,0) 75%, rgba(30,41,59,1) 100%)'
              : 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0) 75%, rgba(255,255,255,1) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y ${
          theme === 'dark' ? 'border-white/15 bg-white/5' : 'border-slate-200 bg-slate-100/70'
        }`}
        style={{ height: ITEM_HEIGHT }}
      />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto"
        style={{
          paddingTop: (COLUMN_HEIGHT - ITEM_HEIGHT) / 2,
          paddingBottom: (COLUMN_HEIGHT - ITEM_HEIGHT) / 2,
        }}
      >
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={`block w-full snap-center transition-colors ${
              theme === 'dark' ? 'text-slate-200 hover:text-white' : 'text-slate-700 hover:text-slate-900'
            }`}
            style={{
              height: ITEM_HEIGHT,
              lineHeight: `${ITEM_HEIGHT}px`,
              fontSize: 17,
              fontWeight: item === value ? 800 : 400,
              opacity: item === value ? 1 : 0.45,
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <span className="sr-only">Selected {value || ''}</span>
    </div>
  )
}

export default function TimePicker({
  value,
  onChange,
  min = '00:00',
  max = '23:59',
  minuteStep = 5,
  placeholder = '--:--',
  labels = { ok: 'OK', cancel: 'Cancel' },
  label,
  icon = faClock,
  size = 'md',
  theme = 'light',
  disabled = false,
  className,
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(null)
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 200 })
  const triggerRef = useRef(null)

  const MIN = toMinutes(min) ?? 0
  const MAX = toMinutes(max) ?? 1439

  const { hours, minutesByHour } = useMemo(() => {
    const minutesByHour = {}
    const hours = []
    for (let h = 0; h < 24; h++) {
      const start = h * 60
      if (start + 59 < MIN || start > MAX) continue
      let lo = 0
      let hi = 59
      if (h === Math.floor(MIN / 60)) lo = Math.ceil((MIN % 60) / minuteStep) * minuteStep
      if (h === Math.floor(MAX / 60)) hi = MAX % 60
      if (lo > 59) continue
      const mins = []
      for (let m = lo; m <= Math.min(hi, 59); m += minuteStep) mins.push(pad(m))
      if (mins.length === 0) continue
      minutesByHour[h] = mins
      hours.push(pad(h))
    }
    return { hours, minutesByHour }
  }, [MIN, MAX, minuteStep])

  const clampDraft = (d) => {
    let { hour, minute } = d
    if (!hours.includes(hour)) hour = hours[0]
    const mins = minutesByHour[Number(hour)]
    if (!mins.includes(minute)) {
      const v = Number(minute)
      minute = mins[mins.length - 1]
      for (const m of mins) {
        if (Number(m) <= v) minute = m
        else break
      }
    }
    return { hour, minute }
  }

  const reposition = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const estHeight = COLUMN_HEIGHT + 90
    const top = rect.bottom + 8 + estHeight > window.innerHeight ? rect.top - estHeight - 8 : rect.bottom + 8
    const left = Math.min(rect.left, window.innerWidth - 340)
    setPos({ top, left, minWidth: Math.min(Math.max(rect.width, 200), 320) })
  }

  const openPopover = () => {
    if (disabled) return
    const t = toMinutes(value)
    let init
    if (t == null) init = toTime(MIN)
    else init = toTime(Math.min(Math.max(t, MIN), MAX))
    const [h, m] = init.split(':')
    setDraft(clampDraft({ hour: h, minute: m }))
    setOpen(true)
    requestAnimationFrame(reposition)
  }

  const close = () => setOpen(false)

  const commit = () => {
    if (draft) onChange(`${draft.hour}:${draft.minute}`)
    close()
  }

  const setHour = (hour) => {
    setDraft((prev) => clampDraft({ hour, minute: prev?.minute ?? minutesByHour[Number(hour)]?.[0] }))
  }

  const setMinute = (minute) => setDraft((prev) => ({ ...prev, minute }))

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    const onMove = () => reposition()
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open])

  const minutes = draft ? minutesByHour[Number(draft.hour)] ?? [] : []

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openPopover}
        disabled={disabled}
        className={`flex w-full items-center gap-3 rounded-[22px] px-5 text-start transition-colors hover:bg-slate-50 ${
          sizeStyles[size]
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${className ?? ''}`}
      >
        {label && (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
            <FontAwesomeIcon icon={icon} className="size-5" />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col text-start">
          {label && <span className="text-xs font-semibold text-slate-400">{label}</span>}
          <span
            className={`truncate text-sm font-bold ${
              value
                ? theme === 'dark'
                  ? 'text-white'
                  : 'text-slate-800'
                : theme === 'dark'
                  ? 'text-slate-500'
                  : 'text-slate-400'
            }`}
          >
            {value || placeholder}
          </span>
        </span>
        <FontAwesomeIcon icon={faChevronDown} className="size-4 shrink-0 text-slate-400" />
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[110]" onMouseDown={close} />
            <div
              className={`fixed z-[111] rounded-2xl p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] ring-1 ${
                theme === 'dark' ? 'bg-slate-800 text-white ring-white/10' : 'bg-white text-slate-900 ring-slate-200'
              }`}
              style={{ top: pos.top, left: pos.left, minWidth: pos.minWidth }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex gap-2">
                <div className="w-16">
                  <Wheel items={hours} value={draft.hour} onChange={setHour} theme={theme} />
                </div>
                <Wheel items={minutes} value={draft.minute} onChange={setMinute} theme={theme} />
              </div>
              <div
                className={`mt-3 flex gap-2 border-t pt-3 ${
                  theme === 'dark' ? 'border-white/10' : 'border-slate-100'
                }`}
              >
                <button
                  type="button"
                  onClick={close}
                  className={`h-10 flex-1 rounded-xl text-sm font-bold transition-colors ${
                    theme === 'dark'
                      ? 'bg-white/5 text-slate-300 hover:bg-white/10'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {labels.cancel}
                </button>
                <button
                  type="button"
                  onClick={commit}
                  className="h-10 flex-1 rounded-xl bg-green-500 text-sm font-bold text-white shadow-[0_10px_25px_rgba(22,163,74,0.35)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-green-600 active:translate-y-0"
                >
                  {labels.ok}
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}
