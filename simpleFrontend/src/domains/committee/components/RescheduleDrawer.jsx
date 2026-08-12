import React, { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import Drawer from '../../../components/dashboard/Drawer'
import { Field, FieldRow, Button, inputClass, selectClass } from '../../../components/dashboard/ui'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'

export default function RescheduleDrawer({ fixture, tournament, stadiums, onClose, onSaved }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const initialDate = fixture.scheduled_at ? fixture.scheduled_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const initialTime = fixture.scheduled_at ? fixture.scheduled_at.slice(11, 16) : '20:00'
  const [form, setForm] = useState({ date: initialDate, time: initialTime, stadium_id: fixture.stadium?.id ?? '' })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setBusy(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}`, {
        scheduled_at: `${form.date}T${form.time}:00`,
        stadium_id: form.stadium_id || undefined,
      })
      toast.success('تم إعادة جدول المباراة')
      onSaved()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر إعادة الجدولة')
    } finally {
      setBusy(false)
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
            <input type="time" className={inputClass} value={form.time} onChange={set('time')} />
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
        <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
          <Button className="flex-1" loading={busy} onClick={save}>
            <CalendarDays className="size-4" />
            حفظ
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </Drawer>
  )
}
