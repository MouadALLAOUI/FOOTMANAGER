import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
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
          className={`h-10 rounded-xl px-4 text-sm font-bold transition-all ${
            isSelected
              ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
              : 'border border-slate-200 bg-white text-slate-800 hover:border-green-400 hover:bg-green-50'
          }`}
        >
          {s.start}
        </button>
      )
    }

    const isWeekly = s.booking?.reservation_type === 'weekly_subscription'
    const reasonText = s.unavailability_reason || (s.status === 'closed' ? 'مغلق' : 'محجوز')

    return (
      <div
        key={s.start}
        title={reasonText}
        className={`flex h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold select-none cursor-not-allowed ${
          s.status === 'closed'
            ? 'border-dashed border-slate-300 bg-slate-100 text-slate-500'
            : isWeekly
              ? 'border-amber-300 bg-amber-50 text-amber-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}
      >
        <span className="font-bold opacity-70 line-through">{s.start}</span>
        <span className="rounded-md bg-white/80 px-1.5 py-0.5 text-[10px] font-bold shadow-2xs truncate max-w-[120px]">
          {reasonText}
        </span>
      </div>
    )
  }

  const legend = (
    <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px] font-bold text-slate-500">
      <span className="flex items-center gap-1">
        <span className="size-2.5 rounded-full bg-green-500" />
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
            <span className="size-5 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500" />
          </div>
        ) : error ? (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>
        ) : unavailableMessage && allSlots.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700">{unavailableMessage}</p>
        ) : allSlots.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-2">
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
                      className={`h-10 rounded-xl px-4 text-sm font-bold transition-all ${
                        duration === m
                          ? 'bg-green-600 text-white shadow-md shadow-green-600/30'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-green-400 hover:bg-green-50'
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
