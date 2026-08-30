import { useId, useMemo } from 'react'

/**
 * TimeSlotPicker — a controlled, keyboard-accessible grid of time-slot badges
 * that replaces native `<input type="time">` / wheel time pickers.
 *
 * It produces/consumes plain `"HH:mm"` (24h) strings so it drops into existing
 * `useState` form state without changing any API contract.
 *
 * Props contract (from the refactor spec):
 *   selectedTime   string|null      currently selected "HH:mm" (or "")
 *   onChange       fn(time:string)  called only when an enabled slot is picked
 *   availableSlots string[]         pickable slot starts, e.g. ["09:00","09:30",...]
 *   disabledSlots  string[]         slot starts rendered as booked/unavailable
 *   label          string           e.g. "الفتحات المتاحة * / Available Slots"
 *   required       boolean          whether the field is required
 *
 * Optional:
 *   loading        boolean          show a placeholder while slots load
 *   emptyText      string           text shown when availableSlots is empty
 *   allowSelectedMissing  boolean   when true, a selectedTime not in the list is
 *                                   still rendered (flagged) instead of hidden
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
}) {
  const gridId = useId()

  const disabledSet = useMemo(() => new Set(disabledSlots), [disabledSlots])

  const slots = useMemo(
    () =>
      [...new Set(availableSlots)]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [availableSlots],
  )

  const selectedIsMissing = selectedTime && !slots.includes(selectedTime)

  if (loading) {
    return (
      <div role="group" aria-label={label}>
        {label && <p className="mb-2 text-xs font-semibold text-slate-500">{label}</p>}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
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
        {label && <p className="mb-2 text-xs font-semibold text-slate-500">{label}</p>}
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-400">
          {emptyText}
        </p>
      </div>
    )
  }

  return (
    <div role="group" aria-labelledby={gridId}>
      {label && (
        <p id={gridId} className="mb-2 flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-500">
          {required && <span className="text-rose-500">*</span>}
          <span>{label}</span>
          {required && <span className="sr-only">(required)</span>}
        </p>
      )}
      <div className="grid max-h-64 grid-cols-3 gap-3 overflow-y-auto pe-1 sm:grid-cols-4 md:grid-cols-5">
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
              }}
              aria-pressed={selected || undefined}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              className={[
                'rounded-xl border px-2 py-2.5 text-center text-sm font-semibold transition-colors',
                disabled
                  ? 'cursor-not-allowed border-slate-200 bg-gray-100 text-slate-400 opacity-50 hover:border-slate-200 hover:bg-gray-100'
                  : selected
                    ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/40',
              ].join(' ')}
            >
              {time}
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
