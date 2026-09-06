import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock, ChevronDown, X, Check } from 'lucide-react'

/**
 * TimeSlotPicker — a controlled, keyboard-accessible grid of time-slot badges
 * that replaces native `<input type="time">` / wheel time pickers.
 *
 * It produces/consumes plain `"HH:mm"` (24h) strings so it drops into existing
 * `useState` form state without changing any API contract.
 *
 * Props contract:
 *   selectedTime   string|null      currently selected "HH:mm" (or "")
 *   onChange       fn(time:string)  called only when an enabled slot is picked
 *   availableSlots string[]         pickable slot starts, e.g. ["09:00","09:30",...]
 *   disabledSlots  string[]         slot starts rendered as booked/unavailable
 *   label          string           e.g. "الفتحات المتاحة * / Available Slots"
 *   required       boolean          whether the field is required
 *   compact        boolean          when true, renders a collapsed trigger that opens a popover
 *   placeholder    string           placeholder when compact is true and no time is selected
 *   emptyText      string           text shown when availableSlots is empty
 *   loading        boolean          show a placeholder while slots load
 */
export default function TimeSlotPicker({
  selectedTime = '',
  onChange,
  availableSlots = [],
  disabledSlots = [],
  label,
  required = false,
  loading = false,
  emptyText = 'لا توجد فتحات متاحة',
  compact = false,
  placeholder,
  className = '',
}) {
  const gridId = useId()
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320 })
  const [isMobile, setIsMobile] = useState(false)

  const disabledSet = useMemo(() => new Set(disabledSlots), [disabledSlots])

  const slots = useMemo(
    () =>
      [...new Set(availableSlots)]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [availableSlots],
  )

  const selectedIsMissing = selectedTime && !slots.includes(selectedTime)
  const isRtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl'

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (!open || isMobile) return
    const update = () => {
      if (!triggerRef.current) return
      const rect = triggerRef.current.getBoundingClientRect()
      const popoverWidth = Math.max(rect.width, 340)
      const popoverHeight = 280
      const spaceBelow = window.innerHeight - rect.bottom
      const showAbove = spaceBelow < popoverHeight && rect.top > popoverHeight

      let left = isRtl ? rect.right - popoverWidth : rect.left
      left = Math.max(12, Math.min(left, window.innerWidth - popoverWidth - 12))

      setPos({
        top: showAbove ? Math.max(12, rect.top - popoverHeight - 8) : rect.bottom + 8,
        left,
        width: popoverWidth,
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, isMobile, isRtl])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const renderGridContent = () => {
    if (loading) {
      return (
        <div role="group" aria-label={label}>
          {label && !compact && <p className="mb-2 text-xs font-semibold text-slate-500">{label}</p>}
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-slate-100 py-3" />
            ))}
          </div>
        </div>
      )
    }

    if (slots.length === 0) {
      return (
        <div role="group" aria-label={label}>
          {label && !compact && <p className="mb-2 text-xs font-semibold text-slate-500">{label}</p>}
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-400">
            {emptyText}
          </p>
        </div>
      )
    }

    return (
      <div role="group" aria-labelledby={gridId}>
        {label && !compact && (
          <p id={gridId} className="mb-2 flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-500">
            {required && <span className="text-rose-500">*</span>}
            <span>{label}</span>
            {required && <span className="sr-only">(required)</span>}
          </p>
        )}
        <div
          dir={isRtl ? 'rtl' : 'ltr'}
          className="grid max-h-64 grid-cols-3 gap-2 sm:gap-2.5 overflow-y-auto pe-1 sm:grid-cols-4 md:grid-cols-5"
        >
          {slots.map((time) => {
            const disabled = disabledSet.has(time)
            const selected = time === selectedTime && !disabled

            return (
              <button
                key={time}
                type="button"
                onClick={() => {
                  if (disabled) return
                  onChange?.(time)
                  if (compact) setOpen(false)
                }}
                aria-pressed={selected || undefined}
                aria-disabled={disabled || undefined}
                disabled={disabled}
                className={[
                  'rounded-xl border px-2 py-2 text-center text-sm font-semibold transition-all duration-150',
                  disabled
                    ? 'cursor-not-allowed border-slate-200 bg-gray-100 text-slate-400 opacity-50'
                    : selected
                      ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700 font-bold shadow-sm'
                      : 'border border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40',
                ].join(' ')}
              >
                <span dir="ltr" className="tabular-nums">
                  {time}
                </span>
              </button>
            )
          })}
        </div>
        {selectedIsMissing && (
          <p className="mt-2 text-xs font-medium text-amber-600">
            التوقيت المحدد ( {selectedTime} ) لم يعد متاحاً — اختر فتحة جديدة لاستبداله.
          </p>
        )}
      </div>
    )
  }

  if (!compact) {
    return renderGridContent()
  }

  const displayPlaceholder = placeholder || label || (isRtl ? 'اختر الوقت' : 'Select time')

  return (
    <div className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-11 w-full items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition-all hover:border-slate-300 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Clock className="size-4 shrink-0 text-slate-400" />
          <span className={`truncate text-sm ${selectedTime ? 'font-bold text-slate-800' : 'text-slate-400 font-medium'}`}>
            {selectedTime ? (
              <span dir="ltr" className="tabular-nums">
                {selectedTime}
              </span>
            ) : (
              displayPlaceholder
            )}
          </span>
        </span>
        <span className="flex items-center gap-1">
          {selectedTime && !required && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onChange?.('')
              }}
              aria-label="Clear time selection"
              className="grid size-5 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown
            className={`size-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[140] bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            {isMobile ? (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={label || displayPlaceholder}
                className="fixed inset-x-0 bottom-0 z-[141] max-h-[80vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-[0_-20px_50px_rgba(2,6,23,0.3)] animate-in slide-in-from-bottom duration-200"
              >
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Clock className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{label || displayPlaceholder}</p>
                      {selectedTime && (
                        <p className="text-[11px] font-semibold text-emerald-600">
                          {isRtl ? 'المحدد:' : 'Selected:'} <span dir="ltr">{selectedTime}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {renderGridContent()}

                {selectedTime && !required && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange?.('')
                      setOpen(false)
                    }}
                    className="mt-4 flex h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    {isRtl ? 'إلغاء تحديد الوقت' : 'Clear selection'}
                  </button>
                )}
              </div>
            ) : (
              <div
                role="dialog"
                aria-modal="true"
                aria-label={label || displayPlaceholder}
                style={{ top: pos.top, left: pos.left, width: pos.width }}
                className="fixed z-[141] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900">{label || displayPlaceholder}</span>
                  </div>
                  {selectedTime && !required && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange?.('')
                      }}
                      className="text-[11px] font-semibold text-rose-500 hover:underline"
                    >
                      {isRtl ? 'مسح' : 'Clear'}
                    </button>
                  )}
                </div>

                {renderGridContent()}
              </div>
            )}
          </>,
          document.body,
        )}
    </div>
  )
}
