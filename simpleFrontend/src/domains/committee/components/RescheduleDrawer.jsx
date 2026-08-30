import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CheckCircle2 } from 'lucide-react'
import Drawer from '../../../components/dashboard/Drawer'
import { Field, FieldRow, Button, inputClass, selectClass } from '../../../components/dashboard/ui'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import TimeSlotPicker from '../../../components/TimeSlotPicker'
import useTerrainSlots from '../../../hooks/useTerrainSlots'
import { buildTimeSlots } from '../../../lib/timeSlots'

export default function RescheduleDrawer({ fixture, tournament, stadiums, onClose, onSaved, onConfirmed }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const integrated = (tournament.terrain_reservation_mode ?? 'independent') === 'integrated'
  const [busy, setBusy] = useState(false)
  const [busyConfirm, setBusyConfirm] = useState(false)
  const initialDate = fixture.scheduled_at ? fixture.scheduled_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const initialTime = fixture.scheduled_at ? fixture.scheduled_at.slice(11, 16) : '20:00'
  const [form, setForm] = useState({ date: initialDate, time: initialTime, stadium_id: fixture.stadium?.id ?? '' })

  const { availableStartTimes, disabledStartTimes, loading } = useTerrainSlots(form.stadium_id || null, form.date || null)
  const avail = form.stadium_id && availableStartTimes.length ? availableStartTimes : buildTimeSlots('08:00', '23:00', 30)
  const dis = form.stadium_id ? disabledStartTimes : []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const payload = () => ({
    scheduled_at: `${form.date}T${form.time}:00`,
    stadium_id: form.stadium_id || undefined,
  })

  const save = async () => {
    setBusy(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}`, payload())
      toast.success(integrated ? 'تم حفظ المسودة' : 'تم إعادة جدول المباراة')
      onSaved()
    } catch (e) {
      toastApiError(e, t, 'تعذر إعادة الجدولة')
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    setBusyConfirm(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}`, payload())
      await api.post(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/confirm-reservation`)
      toast.success('تم حفظ وتأكيد حجز الملعب')
      if (onConfirmed) {
        onConfirmed()
      } else {
        onSaved()
      }
    } catch (e) {
      toastApiError(e, t, 'تعذر تأكيد الحجز')
    } finally {
      setBusyConfirm(false)
    }
  }

  return (
    <Drawer open onClose={onClose} title="إعادة جدولة المباراة" subtitle="اختر تاريخًا ووقتًا جديدًا للمباراة">
      <div className="space-y-5">
        <FieldRow>
          <Field label="التاريخ">
            <input type="date" className={inputClass} value={form.date} onChange={set('date')} />
          </Field>
          <Field label="الوقت">
            <TimeSlotPicker
              selectedTime={form.time}
              onChange={(v) => setForm((f) => ({ ...f, time: v }))}
              availableSlots={avail}
              disabledSlots={dis}
              loading={loading}
              label="الوقت"
            />
          </Field>
        </FieldRow>
        <Field label="الملعب">
          <select className={selectClass} value={form.stadium_id} onChange={set('stadium_id')}>
            <option value="">احتفظ بالملعب الحالي</option>
            {(stadiums || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>

        {integrated && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            الحجز بنظام (بالتأكيد): حفظ التعديل يحفظه كمسودة دون حجز الملعب. سيُحرَّر الحجز القديم ويبقى المكان حرًا حتى تأكيد التعديل.
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          {integrated ? (
            <>
              <Button variant="outline" className="flex-1" loading={busy} onClick={save}>
                <CalendarDays className="size-4" />
                حفظ المسودة
              </Button>
              <Button className="flex-1" loading={busyConfirm} onClick={confirm}>
                <CheckCircle2 className="size-4" />
                حفظ وتأكيد الحجز
              </Button>
            </>
          ) : (
            <Button className="flex-1" loading={busy} onClick={save}>
              <CalendarDays className="size-4" />
              حفظ
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </Drawer>
  )
}
