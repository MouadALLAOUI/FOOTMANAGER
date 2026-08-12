import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, User, Phone } from 'lucide-react'
import Modal from '../../../components/ui/Modal'
import { Button } from '../../../components/dashboard/ui'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'

export default function GuestBookingModal({ open, onClose, terrainId, date, refresh }) {
  const { toast } = useToast()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ start_time: '', end_time: '', booking_type: 'training', guest_name: '', guest_phone: '', guest_email: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || !terrainId || !date) return
    setLoading(true)
    api
      .get(`/terrains/${terrainId}/slots`, { params: { date } })
      .then((r) => {
        const available = (r.data.slots || []).filter((s) => s.status === 'available')
        setSlots(available)
      })
      .catch(() => toast.error('تعذر جلب الفتحات'))
      .finally(() => setLoading(false))
  }, [open, terrainId, date, toast])

  const timeOptions = useMemo(() => {
    return slots.map((s) => ({ start: s.start, end: s.end }))
  }, [slots])

  const submit = async () => {
    if (!form.start_time || !form.end_time || !form.guest_name || !form.guest_phone) {
      toast.error('الرجاء إكمال الحقول المطلوبة')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        reservation_type: 'single',
        booking_date: date,
        start_time: form.start_time,
        end_time: form.end_time,
        booking_type: form.booking_type,
        guest_name: form.guest_name,
        guest_phone: form.guest_phone,
        guest_email: form.guest_email || null,
        notes: form.notes || null,
      }
      const r = await api.post(`/owner/terrains/${terrainId}/guest-bookings`, payload)
      toast.success(r.data?.message || 'تم إنشاء الحجز')
      if (r.data?.whatsapp_notification_url) window.open(r.data.whatsapp_notification_url, '_blank')
      onClose()
      refresh && refresh()
    } catch (e) {
      toast.error(e.response?.data?.message || 'فشل إنشاء الحجز')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="إنشاء حجز زائر" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-400">التاريخ</label>
            <div className="mt-1 text-sm font-extrabold text-slate-800">{date}</div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400">الفتحات المتاحة</label>
            <select className="mt-1 w-full rounded-xl border p-2" value={form.start_time + '|' + form.end_time} onChange={(e) => {
              const [s, eTime] = e.target.value.split('|')
              setForm((f) => ({ ...f, start_time: s, end_time: eTime }))
            }}>
              <option value="">اختر توقيتاً</option>
              {timeOptions.map((t) => (
                <option key={`${t.start}|${t.end}`} value={`${t.start}|${t.end}`}>{t.start} — {t.end}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-400">نوع الحجز</label>
            <select className="mt-1 w-full rounded-xl border p-2" value={form.booking_type} onChange={(e) => setForm((f) => ({ ...f, booking_type: e.target.value }))}>
              <option value="training">حصة تدريبية</option>
              <option value="private">حجز خاص</option>
              <option value="match">مباراة</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400">ملاحظات</label>
            <input className="mt-1 w-full rounded-xl border p-2" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-slate-400">اسم الزبون</label>
            <div className="mt-1 flex items-center gap-2">
              <User className="size-4 text-slate-400" />
              <input className="w-full rounded-xl border p-2" value={form.guest_name} onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400">هاتف الزبون</label>
            <div className="mt-1 flex items-center gap-2">
              <Phone className="size-4 text-slate-400" />
              <input className="w-full rounded-xl border p-2" value={form.guest_phone} onChange={(e) => setForm((f) => ({ ...f, guest_phone: e.target.value }))} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400">ايميل الزبون (اختياري)</label>
          <input className="mt-1 w-full rounded-xl border p-2" value={form.guest_email} onChange={(e) => setForm((f) => ({ ...f, guest_email: e.target.value }))} />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} disabled={submitting || loading}>{submitting ? 'جارٍ...' : 'إنشاء الحجز'}</Button>
        </div>
      </div>
    </Modal>
  )
}
