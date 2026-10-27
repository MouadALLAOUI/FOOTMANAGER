import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { Field } from './dashboard/ui'

const DURATIONS = [60, 90, 120]

function minutesBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

export function addTimeMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function computeDurationOptions(available, start) {
  if (!start) return [60]
  const idx = available.findIndex((s) => s.start === start)
  if (idx === -1) return [60]
  const slotMins = minutesBetween(available[idx].start, available[idx].end) || 60
  let total = slotMins
  for (let i = idx + 1; i < available.length; i++) {
    if (available[i].start !== available[i - 1].end) break
    total += minutesBetween(available[i].start, available[i].end) || 60
  }
  const opts = DURATIONS.filter((m) => m <= total)
  return opts.length ? opts : [slotMins]
}

export default function TimesSelect({
  resourceId,
  date,
  value,
  onChange,
  duration,
  onDurationChange,
  disabled = false,
  showDuration = false,
  label,
  hint,
  className = '',
}) {
  const { t } = useTranslation()
  const [slots, setSlots] = useState([])
  const [allSlots, setAllSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [closed, setClosed] = useState(false)
  const [closedReason, setClosedReason] = useState('')
  const [dayMessage, setDayMessage] = useState('')

  const loadSlots = useCallback(async () => {
    if (!resourceId || !date) return
    setLoading(true)
    setError('')
    setClosed(false)
    setClosedReason('')
    setDayMessage('')
    try {
      const { data } = await api.get(`/terrains/${resourceId}/slots`, { params: { date } })
      const raw = data.slots || []
      const sortedRaw = [...raw].sort((a, b) => a.start.localeCompare(b.start))
      setAllSlots(sortedRaw)
      setSlots(sortedRaw.filter((s) => s.status === 'available'))
      setClosed(Boolean(data.terrain_closed))
      setClosedReason(data.closure_reason || '')
      setDayMessage(data.message || '')
    } catch {
      setError(t('publicActions.slotsLoadError', 'تعذر جلب الأوقات المتاحة'))
    } finally {
      setLoading(false)
    }
  }, [resourceId, date, t])

  useEffect(() => {
    setSlots([])
    setAllSlots([])
    onChange?.('')
    if (resourceId && date) loadSlots()
  }, [resourceId, date])

  const available = useMemo(() => slots, [slots])

  const durationOptions = useMemo(() => {
    if (!showDuration || !value) return []
    return computeDurationOptions(available, value)
  }, [available, value, showDuration])

  useEffect(() => {
    if (showDuration && durationOptions.length && onDurationChange) {
      onDurationChange(durationOptions[0])
    }
  }, [durationOptions])

  const endTime = value && duration ? addTimeMinutes(value, duration) : ''

  const unavailableMessage = closed
    ? closedReason || t('publicActions.terrainClosed', 'الملعب مغلق')
    : dayMessage

  const renderSlotItem = (s) => {
    const isAvail = s.status === 'available'
    if (isAvail) {
      const isSelected = value === s.start
      return (
        <button
          key={s.start}
          type="button"
          disabled={disabled || closed}
          onClick={() => onChange?.(s.start)}
          className={`h-14 flex flex-col items-center justify-center rounded-xl border px-1 text-center transition-all cursor-pointer ${
            isSelected
              ? 'bg-emerald-500 text-white font-black shadow-md border-emerald-600 ring-2 ring-emerald-500/20'
              : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-400 hover:bg-emerald-50/50'
          }`}
        >
          <span className="text-sm font-black tracking-tight">{s.start}</span>
          <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-white/90' : 'text-emerald-600'}`}>
            متاح
          </span>
        </button>
      )
    }

    const isWeekly = s.booking?.reservation_type === 'weekly_subscription'
    const reasonText = s.unavailability_reason || (s.status === 'closed' ? 'مغلق' : 'محجوز')

    return (
      <div
        key={s.start}
        title={reasonText}
        className={`h-14 flex flex-col items-center justify-center rounded-xl border px-1 text-center select-none cursor-not-allowed overflow-hidden ${
          s.status === 'closed'
            ? 'border-dashed border-slate-300 bg-slate-100 text-slate-400'
            : isWeekly
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}
      >
        <span className="font-mono text-xs font-bold opacity-75 line-through leading-tight">{s.start}</span>
        <span className="text-[10px] font-bold truncate max-w-full px-1 leading-tight mt-0.5">
          {reasonText}
        </span>
      </div>
    )
  }

  const legend = (
    <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] font-bold text-slate-500">
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-emerald-500" />
        <span>متاح</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-rose-500" />
        <span>محجوز</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-amber-500" />
        <span>أبونمان أسبوعي</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-slate-400" />
        <span>مغلق</span>
      </span>
    </div>
  )

  return (
    <div className={className}>
      <Field label={label || t('publicActions.chooseSlot', 'اختر التوقيت')} required hint={hint}>
        {loading ? (
          <div className="flex h-12 items-center justify-center">
            <span className="size-5 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-500" />
          </div>
        ) : error ? (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>
        ) : unavailableMessage && allSlots.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700">{unavailableMessage}</p>
        ) : allSlots.length > 0 ? (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
              {allSlots.map(renderSlotItem)}
            </div>
            {legend}
            {showDuration && value && durationOptions.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                <span className="text-xs font-bold text-slate-500">
                  {t('publicActions.duration', 'المدة')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={disabled}
                      onClick={() => onDurationChange?.(m)}
                      className={`h-10 rounded-xl px-4 text-sm font-bold transition-all cursor-pointer ${
                        duration === m
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:bg-emerald-50'
                      }`}
                    >
                      {m} {t('publicActions.min', 'دقيقة')}
                    </button>
                  ))}
                </div>
                {endTime && (
                  <p className="text-xs font-semibold text-slate-600">
                    {value} — {endTime}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500">{t('publicActions.noSlots', 'لا فتحات متاحة')}</p>
        )}
      </Field>
    </div>
  )
}
