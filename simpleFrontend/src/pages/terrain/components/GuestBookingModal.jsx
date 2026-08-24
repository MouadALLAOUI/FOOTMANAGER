import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarRange, Mail, Phone, User } from 'lucide-react'
import { Button, Field, FieldRow, inputClass, Modal, selectClass } from '../../../components/dashboard/ui'
import api from '../../../api/client'
import { toastApiError } from '../../../lib/errors'
import { useToast } from '../../../components/ui/Toast'
import TimesSelect, { addTimeMinutes } from '../../../components/TimesSelect'

const DAY_LABELS = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
]

const RESERVATION_TYPES = [
  { key: 'single', label: 'حجز فردي' },
  { key: 'weekly_subscription', label: 'أبونمان أسبوعي' },
]

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isValidPhone(v) {
  return /^[0-9+\-() ]{8,20}$/.test(v)
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function FieldInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      {Icon && <Icon className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />}
      <input className={`${inputClass} ${Icon ? 'ps-11' : ''} ${className}`} {...props} />
    </div>
  )
}

export default function GuestBookingModal({ open, onClose, terrainId, terrainName, date, refresh }) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const todayStr = useMemo(() => toISODate(new Date()), [])
  const [reservationType, setReservationType] = useState('single')
  const [form, setForm] = useState({
    start_time: '',
    end_time: '',
    booking_type: 'training',
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    notes: '',
    start_date: date || todayStr,
    end_date: '',
  })
  const [duration, setDuration] = useState(60)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setReservationType('single')
    setDuration(60)
    setForm((f) => ({
      ...f,
      start_time: '',
      end_time: '',
      start_date: date || todayStr,
      end_date: '',
    }))
  }, [open, date, todayStr])

  const activeDate = form.start_date

  const handleStartTimeChange = (time) => {
    const endTime = time ? addTimeMinutes(time, duration) : ''
    setForm((f) => ({ ...f, start_time: time, end_time: endTime }))
  }

  const handleDurationChange = (mins) => {
    setDuration(mins)
    if (form.start_time) {
      setForm((f) => ({ ...f, end_time: addTimeMinutes(f.start_time, mins) }))
    }
  }

  const dayOfWeek = useMemo(() => {
    const d = form.start_date || todayStr
    return new Date(d + 'T00:00:00').getDay()
  }, [form.start_date, todayStr])

  const dayLabel = DAY_LABELS.find((d) => d.value === dayOfWeek)?.label || ''

  const submit = async () => {
    if (!form.start_time || !form.end_time || !form.guest_name.trim()) {
      toast.error(t('validation.guestNameAndTimeRequired'))
      return
    }
    const phone = (form.guest_phone || '').trim()
    const email = (form.guest_email || '').trim()
    if (!phone && !email) {
      toast.error(t('validation.phoneOrEmailRequired'))
      return
    }
    if (phone && !isValidPhone(phone)) {
      toast.error(t('validation.invalidPhone'))
      return
    }
    if (email && !isValidEmail(email)) {
      toast.error(t('validation.invalidEmail'))
      return
    }
    if (reservationType === 'weekly_subscription' && !form.start_date) {
      toast.error(t('validation.subscriptionStartDateRequired'))
      return
    }
    setSubmitting(true)
    try {
      const isWeekly = reservationType === 'weekly_subscription'
      const payload = {
        reservation_type: reservationType,
        booking_date: isWeekly ? null : form.start_date || date,
        start_date: isWeekly ? form.start_date : null,
        end_date: isWeekly ? form.end_date || null : null,
        day_of_week: isWeekly ? dayOfWeek : null,
        start_time: form.start_time,
        end_time: form.end_time,
        booking_type: form.booking_type,
        guest_name: form.guest_name.trim(),
        guest_phone: phone || null,
        guest_email: email || null,
        notes: form.notes || null,
      }
      const r = await api.post(`/owner/terrains/${terrainId}/guest-bookings`, payload)
      toast.success(r.data?.message || 'تم إنشاء الحجز')
      if (r.data?.whatsapp_notification_url) window.open(r.data.whatsapp_notification_url, '_blank')
      onClose()
      if (refresh) refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إنشاء حجز زائر"
      subtitle={terrainName ? `${terrainName} • ${date}` : date}
      size="lg"
    >
      <div className="space-y-5">
        <FieldRow cols={2}>
          <Field label="نوع الحجز" required>
            <div className="flex gap-1 rounded-2xl bg-slate-100 p-1">
              {RESERVATION_TYPES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setReservationType(r.key)}
                  className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    reservationType === r.key ? 'bg-white text-slate-900 shadow' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="نوع النشاط" required>
            <select className={selectClass} value={form.booking_type} onChange={(e) => setForm((f) => ({ ...f, booking_type: e.target.value }))}>
              <option value="training">حصة تدريبية</option>
              <option value="private">حجز خاص</option>
              <option value="match">مباراة</option>
            </select>
          </Field>
        </FieldRow>

        {reservationType === 'single' ? (
          <FieldRow cols={2}>
            <Field label="التاريخ" required>
              <FieldInput icon={CalendarRange} type="date" min={todayStr} value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
            </Field>
            <TimesSelect
              resourceId={terrainId}
              date={activeDate}
              value={form.start_time}
              onChange={handleStartTimeChange}
              duration={duration}
              onDurationChange={handleDurationChange}
              showDuration
              disabled={submitting}
              label="الفتحات المتاحة"
            />
          </FieldRow>
        ) : (
          <>
            <FieldRow cols={3}>
              <Field label="تاريخ البداية" required>
                <input
                  type="date"
                  min={todayStr}
                  className={inputClass}
                  value={form.start_date}
                  onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                />
              </Field>
              <Field label="تاريخ النهاية (اختياري)">
                <input
                  type="date"
                  min={form.start_date || todayStr}
                  className={inputClass}
                  value={form.end_date}
                  onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </Field>
              <Field label="اليوم الأسبوعي">
                <div className={`${inputClass} flex cursor-default items-center gap-2 bg-slate-50 text-slate-700`}>
                  <CalendarRange className="size-4 text-green-500" />
                  {dayLabel}
                </div>
              </Field>
            </FieldRow>
            <TimesSelect
              resourceId={terrainId}
              date={activeDate}
              value={form.start_time}
              onChange={handleStartTimeChange}
              duration={duration}
              onDurationChange={handleDurationChange}
              showDuration
              disabled={submitting}
              label="الفتحات المتاحة"
            />
          </>
        )}

        <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <Field label="اسم الزبون" required>
            <FieldInput icon={User} value={form.guest_name} onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))} />
          </Field>
          <Field label="هاتف الزبون (أو البريد)" hint="أدخل الهاتف أو البريد الإلكتروني للتواصل مع الزبون">
            <FieldInput icon={Phone} value={form.guest_phone} onChange={(e) => setForm((f) => ({ ...f, guest_phone: e.target.value }))} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ايميل الزبون (اختياري)">
            <FieldInput icon={Mail} value={form.guest_email} onChange={(e) => setForm((f) => ({ ...f, guest_email: e.target.value }))} />
          </Field>
          <Field label="ملاحظات">
            <FieldInput value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </Field>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? 'جارٍ...' : 'إنشاء الحجز'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
