import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { queryClient } from '../../../api/queryClient'
import { useToast } from '../../../components/ui/Toast'
import { Button, Field, inputClass } from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import TimesSelect, { addTimeMinutes } from '../../../components/TimesSelect'

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ClosureDrawer({ open, onClose, terrainId, terrainName, date, startTime, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [selectedDate, setSelectedDate] = useState(date || '')
  const [slotStartTime, setSlotStartTime] = useState(startTime || '')
  const [duration, setDuration] = useState(60)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open) {
      setSelectedDate(date || toISODate(new Date()))
      setSlotStartTime(startTime || '')
      setDuration(60)
      setReason('')
      setSubmitError('')
    }
  }, [open, date, startTime])

  const endTime = slotStartTime ? addTimeMinutes(slotStartTime, duration) : ''

  const canSubmit = Boolean(selectedDate && slotStartTime && endTime) && !busy

  const invalidateCalendar = () => {
    queryClient.invalidateQueries({ queryKey: ['owner', 'terrain-calendar'] })
    queryClient.invalidateQueries({ queryKey: ['owner', 'terrains'] })
    queryClient.invalidateQueries({ queryKey: ['owner', 'closures'] })
  }

  const submit = async () => {
    if (!canSubmit) return
    setBusy(true)
    setSubmitError('')
    try {
      await api.post(`/owner/terrains/${terrainId}/slot-closures`, {
        closure_date: selectedDate,
        start_time: slotStartTime,
        end_time: endTime,
        reason: reason || null,
      })
      toast.success(t('terrain.closures.created', 'تم إغلاق التوقيت بنجاح'))
      invalidateCalendar()
      onSaved?.()
      onClose()
    } catch (e) {
      const msg = e.response?.data?.message || t('terrain.closures.createFailed', 'تعذر إغلاق التوقيت')
      setSubmitError(msg)
    } finally {
      setBusy(false)
    }
  }

  const today = toISODate(new Date())

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('terrain.closures.drawerTitle', 'إغلاق موعد')}
      subtitle={terrainName || t('terrain.closures.drawerSubtitle', 'حدد الوقت المتاح للإغلاق')}
    >
      <div className="space-y-4">
        <Field label={t('terrain.closures.date', 'التاريخ')} required>
          <input
            type="date"
            min={today}
            className={inputClass}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value)
              setSlotStartTime('')
            }}
          />
        </Field>

        {selectedDate && (
          <TimesSelect
            resourceId={terrainId}
            date={selectedDate}
            value={slotStartTime}
            onChange={(v) => {
              setSlotStartTime(v)
              setDuration(60)
            }}
            duration={duration}
            onDurationChange={setDuration}
            showDuration
            disabled={busy}
            label={t('terrain.closures.selectAvailableSlot', 'اختر الوقت المتاح')}
            hint={t('terrain.closures.selectAvailableSlotHint', 'اختر وقت البداية ثم المدة المراد إغلاقها')}
          />
        )}

        {slotStartTime && endTime && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
            <p className="text-xs font-bold text-slate-500 mb-2">
              {t('terrain.closures.summary', 'ملخص الإغلاق')}
            </p>
            <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <span dir="ltr">{slotStartTime} — {endTime}</span>
              <span className="text-xs font-bold text-slate-400">
                ({duration} {t('terrain.closures.minutes', 'دقيقة')})
              </span>
            </div>
          </div>
        )}

        <Field label={t('terrain.closures.reasonOptional', 'السبب (اختياري)')}>
          <input
            className={inputClass}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('terrain.closures.reasonPlaceholder', 'مثال: صيانة')}
          />
        </Field>

        {submitError && (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{submitError}</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button className="flex-1" disabled={!canSubmit} loading={busy} onClick={submit}>
            {t('terrain.closures.confirm', 'تأكيد الإغلاق')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('common.cancel', 'إلغاء')}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
