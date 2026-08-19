import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useToast } from '../ui/Toast'
import { Modal, Field, Button, inputClass } from '../dashboard/ui'
import { getApiErrorMessage } from '../../lib/errors'
import TimesSelect, { addTimeMinutes } from '../TimesSelect'

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function BookingModal({ open, onClose, field, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [date, setDate] = useState(() => toISODate(new Date()))
  const [start, setStart] = useState('')
  const [duration, setDuration] = useState(60)
  const [bookingType, setBookingType] = useState('training')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setSubmitError('')
      setStart('')
      setDuration(60)
      setDate(toISODate(new Date()))
    }
  }, [open])

  const endTime = start ? addTimeMinutes(start, duration) : ''
  const canSubmit = Boolean(start && endTime) && !busy

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
      } else {
        setSubmitError(msg)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('publicActions.bookingTitle')}
      subtitle={field?.name}
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

        <TimesSelect
          resourceId={field?.id}
          date={date}
          value={start}
          onChange={(v) => { setStart(v); setDuration(60) }}
          duration={duration}
          onDurationChange={setDuration}
          showDuration
          hint={field ? `${t('publicActions.pricePerHour', 'السعر/ساعة')}: ${field.price_per_team ?? '—'}` : undefined}
        />

        {start && (
          <>
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

        {submitError && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{submitError}</p>}

        <Button className="w-full" disabled={!canSubmit} loading={busy} onClick={submit}>
          {t('publicActions.confirmBooking')}
        </Button>
      </div>
    </Modal>
  )
}
