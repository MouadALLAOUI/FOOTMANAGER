import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useToast } from '../ui/Toast'
import { Modal, Field, Button, inputClass } from '../dashboard/ui'
import { getApiErrorMessage } from '../../lib/errors'

const DURATIONS = [60, 90, 120]

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function minutesBetween(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export default function BookingModal({ open, onClose, field, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [date, setDate] = useState(() => toISODate(new Date()))
  const [slotsData, setSlotsData] = useState(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [start, setStart] = useState('')
  const [duration, setDuration] = useState(60)
  const [bookingType, setBookingType] = useState('training')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadSlots = useCallback(
    async (d) => {
      if (!open || !field?.id || !d) return
      setLoadingSlots(true)
      setSlotsError('')
      try {
        const { data } = await api.get(`/terrains/${field.id}/slots`, { params: { date: d } })
        setSlotsData(data)
        setStart('')
      } catch {
        setSlotsError(t('publicActions.slotsLoadError'))
      } finally {
        setLoadingSlots(false)
      }
    },
    [open, field?.id, t],
  )

  useEffect(() => {
    if (open) {
      setSubmitError('')
      setStart('')
      setSlotsData(null)
      setDate(toISODate(new Date()))
    }
  }, [open])

  useEffect(() => {
    if (open && date) loadSlots(date)
  }, [open, date, loadSlots])

  const terrain = slotsData?.terrain
  const closed = Boolean(slotsData?.terrain_closed)
  const closedReason = slotsData?.closure_reason || ''
  const dayMessage = slotsData?.message || ''
  const slots = slotsData?.slots || []

  const available = useMemo(
    () => slots.filter((s) => s.status === 'available').sort((a, b) => a.start.localeCompare(b.start)),
    [slots],
  )

  const durationOptions = useMemo(() => {
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
  }, [available, start])

  useEffect(() => {
    setDuration(durationOptions[0])
  }, [durationOptions, start])

  const endTime = start ? addMinutes(start, duration) : ''

  const canSubmit = Boolean(start && endTime) && !closed && !busy

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setSubmitError('')
    try {
      await api.post('/manager/bookings/training', {
        terrain_id: field.id,
        reservation_type: 'single',
        booking_date: date,
        start_time: start,
        end_time: endTime,
        booking_type: bookingType,
        notes: notes || undefined,
      })
      toast.success(t('publicActions.bookingSuccess'))
      onSaved?.()
      onClose()
    } catch (e) {
      const msg = getApiErrorMessage(e, t, t('publicActions.bookingError'))
      if (e.response?.data?.message) {
        toast.error(msg)
        loadSlots(date)
      } else {
        setSubmitError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  const unavailableMessage = closed
    ? closedReason || t('publicActions.terrainClosed')
    : dayMessage || (slots.length === 0 ? t('publicActions.terrainClosed') : '')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('publicActions.bookingTitle')}
      subtitle={field?.name || terrain?.name}
      size="lg"
    >
      <div className="space-y-4">
        <Field label={t('publicActions.date')} required>
          <input
            type="date"
            min={toISODate(new Date())}
            className={inputClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        {unavailableMessage && (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700">
            {unavailableMessage}
          </p>
        )}

        <Field
          label={t('publicActions.chooseSlot')}
          required
          hint={terrain ? `${t('publicActions.pricePerHour')}: ${terrain.price_per_team ?? '—'}` : undefined}
        >
          {loadingSlots ? (
            <div className="flex h-12 items-center justify-center">
              <span className="size-5 animate-spin rounded-full border-2 border-green-500/20 border-t-green-500" />
            </div>
          ) : available.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {available.map((s) => (
                <button
                  key={s.start}
                  type="button"
                  disabled={closed}
                  onClick={() => setStart(s.start)}
                  className={`h-10 rounded-xl px-4 text-sm font-bold transition-all ${
                    start === s.start
                      ? 'bg-green-500 text-white shadow-md shadow-green-500/30'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-green-400 hover:bg-green-50'
                  }`}
                >
                  {s.start}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">{t('publicActions.noSlots')}</p>
          )}
        </Field>

        {start && (
          <>
            <Field label={t('publicActions.duration')} required>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    className={`h-10 rounded-xl px-4 text-sm font-bold transition-all ${
                      duration === m
                        ? 'bg-green-500 text-white shadow-md shadow-green-500/30'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-green-400 hover:bg-green-50'
                    }`}
                  >
                    {m} {t('publicActions.min')}
                  </button>
                ))}
              </div>
              <span className="mt-2 block text-xs font-semibold text-slate-600">
                {t('publicActions.summary', { start, end: endTime })}
              </span>
            </Field>

            <Field label={t('publicActions.bookingType')} required>
              <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
                {['training', 'private'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBookingType(type)}
                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                      bookingType === type ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t(`publicActions.types.${type}`)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={t('publicActions.notes')}>
              <textarea
                rows={3}
                className={`${inputClass} h-auto py-3`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </>
        )}

        {slotsError && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{slotsError}</p>}
        {submitError && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{submitError}</p>}

        <Button className="w-full" disabled={!canSubmit} loading={busy} onClick={submit}>
          {t('publicActions.confirmBooking')}
        </Button>
      </div>
    </Modal>
  )
}
