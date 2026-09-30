import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarRange, Mail, Phone, User, Search, ShieldCheck, Loader2 } from 'lucide-react'
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

function normalizeToISO(dateVal) {
  if (!dateVal) return ''
  if (typeof dateVal !== 'string') {
    try {
      return toISODate(dateVal)
    } catch {
      return ''
    }
  }
  const clean = dateVal.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean
  const parts = clean.split(/[-/]/)
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`
    } else if (parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`
    }
  }
  const parsed = new Date(clean)
  if (!isNaN(parsed.getTime())) {
    return toISODate(parsed)
  }
  return clean
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
  const [clientType, setClientType] = useState('manager') // 'manager' | 'unregistered'
  const [managers, setManagers] = useState([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManager, setSelectedManager] = useState(null)

  const [form, setForm] = useState({
    start_time: '',
    end_time: '',
    booking_type: 'training',
    guest_name: '',
    guest_phone: '',
    guest_email: '',
    notes: '',
    start_date: normalizeToISO(date) || todayStr,
    end_date: '',
  })
  const [duration, setDuration] = useState(60)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const initialDate = normalizeToISO(date) || todayStr
    setReservationType('single')
    setClientType('manager')
    setSelectedManager(null)
    setSearchQuery('')
    setDuration(60)
    setForm((f) => ({
      ...f,
      start_time: '',
      end_time: '',
      guest_name: '',
      guest_phone: '',
      guest_email: '',
      notes: '',
      start_date: initialDate,
      end_date: '',
    }))

    let active = true
    setLoadingManagers(true)
    api.get('/owner/managers')
      .then((res) => {
        if (active) {
          setManagers(res.data?.data || [])
        }
      })
      .catch((err) => {
        console.error('Failed to load managers', err)
      })
      .finally(() => {
        if (active) setLoadingManagers(false)
      })

    return () => {
      active = false
    }
  }, [open, date, todayStr])

  const activeDate = normalizeToISO(form.start_date) || todayStr

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
    const d = normalizeToISO(form.start_date) || todayStr
    return new Date(d + 'T00:00:00').getDay()
  }, [form.start_date, todayStr])

  const dayLabel = DAY_LABELS.find((d) => d.value === dayOfWeek)?.label || ''

  const filteredManagers = useMemo(() => {
    if (!searchQuery.trim()) return managers
    const q = searchQuery.toLowerCase().trim()
    return managers.filter((m) =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.team_name || '').toLowerCase().includes(q) ||
      (m.phone || '').includes(q) ||
      (m.email || '').toLowerCase().includes(q)
    )
  }, [managers, searchQuery])

  const submit = async () => {
    if (!form.start_time || !form.end_time) {
      toast.error('يرجى تحديد وقت الحجز والفتحة المتاحة')
      return
    }

    if (clientType === 'manager') {
      if (!selectedManager) {
        toast.error('يرجى اختيار مدير من قائمة المدراء أو التبديل إلى زبون جديد')
        return
      }
    } else {
      if (!form.guest_name.trim()) {
        toast.error('اسم الزبون مطلوب')
        return
      }
      const phone = (form.guest_phone || '').trim()
      const email = (form.guest_email || '').trim()
      if (!phone && !email) {
        toast.error(t('validation.phoneOrEmailRequired') || 'أدخل الهاتف أو البريد الإلكتروني للتواصل مع الزبون')
        return
      }
      if (phone && !isValidPhone(phone)) {
        toast.error(t('validation.invalidPhone') || 'رقم الهاتف غير صالح')
        return
      }
      if (email && !isValidEmail(email)) {
        toast.error(t('validation.invalidEmail') || 'البريد الإلكتروني غير صالح')
        return
      }
    }

    if (reservationType === 'weekly_subscription' && !form.start_date) {
      toast.error(t('validation.subscriptionStartDateRequired') || 'تاريخ بداية الأبونمان مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const isWeekly = reservationType === 'weekly_subscription'
      const resolvedDate = normalizeToISO(form.start_date) || normalizeToISO(date) || todayStr
      const payload = {
        reservation_type: reservationType,
        booking_date: isWeekly ? null : resolvedDate,
        start_date: isWeekly ? resolvedDate : null,
        end_date: isWeekly && form.end_date ? normalizeToISO(form.end_date) : null,
        day_of_week: isWeekly ? dayOfWeek : null,
        start_time: form.start_time,
        end_time: form.end_time,
        booking_type: form.booking_type,
        manager_id: clientType === 'manager' ? selectedManager.id : null,
        guest_name: clientType === 'manager' ? selectedManager.name : form.guest_name.trim(),
        guest_phone: clientType === 'manager' ? (selectedManager.phone || null) : (form.guest_phone?.trim() || null),
        guest_email: clientType === 'manager' ? (selectedManager.email || null) : (form.guest_email?.trim() || null),
        notes: form.notes?.trim() || null,
      }
      const r = await api.post(`/owner/terrains/${terrainId}/guest-bookings`, payload)
      toast.success(r.data?.message || 'تم إنشاء الحجز بنجاح')
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

        {/* Client Selection Section */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <User className="size-4 text-emerald-600" />
              <span>بيانات الزبون / العميل</span>
              <span className="text-rose-500">*</span>
            </label>

            {/* Segmented Toggle for Client Type */}
            <div className="flex rounded-xl bg-slate-100 p-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setClientType('manager')
                }}
                className={`flex-1 sm:flex-none rounded-lg px-3.5 py-1.5 text-xs font-black transition-all ${
                  clientType === 'manager'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                مدير مسجل بالمنصة
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientType('unregistered')
                  setSelectedManager(null)
                }}
                className={`flex-1 sm:flex-none rounded-lg px-3.5 py-1.5 text-xs font-black transition-all ${
                  clientType === 'unregistered'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                زبون جديد (غير مسجل)
              </button>
            </div>
          </div>

          {/* MODE 1: Registered Manager */}
          {clientType === 'manager' && (
            <div className="space-y-3">
              {selectedManager ? (
                /* Selected Manager Card */
                <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/40 p-4 transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 font-black text-white shadow-xs text-sm">
                        {selectedManager.avatar_url ? (
                          <img src={selectedManager.avatar_url} alt="" className="size-full rounded-2xl object-cover" />
                        ) : (
                          selectedManager.name?.charAt(0) || 'م'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">{selectedManager.name}</h4>
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                            مدير مسجل
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-semibold text-slate-500">
                          {selectedManager.team_name && (
                            <span className="flex items-center gap-1 font-bold text-slate-700">
                              <ShieldCheck className="size-3.5 text-emerald-600" />
                              فريق: {selectedManager.team_name}
                            </span>
                          )}
                          {selectedManager.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3.5 text-slate-400" />
                              <span dir="ltr">{selectedManager.phone}</span>
                            </span>
                          )}
                          {selectedManager.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="size-3.5 text-slate-400" />
                              <span>{selectedManager.email}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedManager(null)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                    >
                      تغيير المدير
                    </button>
                  </div>
                </div>
              ) : (
                /* Manager Search & Select List */
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن مدير بالاسم أو الفريق أو رقم الهاتف..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`${inputClass} ps-10 text-xs font-semibold`}
                    />
                  </div>

                  {loadingManagers ? (
                    <div className="flex items-center justify-center p-6 text-xs font-bold text-slate-400 gap-2">
                      <Loader2 className="size-4 animate-spin text-emerald-600" />
                      <span>جارٍ تحميل قائمة المدراء...</span>
                    </div>
                  ) : filteredManagers.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                      {searchQuery ? 'لا توجد نتائج مطابقة لبحثك' : 'لا يوجد مدراء مسجلين'}
                    </div>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2">
                      {filteredManagers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedManager(m)
                            setForm((f) => ({
                              ...f,
                              guest_name: m.name,
                              guest_phone: m.phone || '',
                              guest_email: m.email || '',
                            }))
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white p-2.5 text-start transition hover:border-emerald-300 hover:bg-emerald-50/50 hover:shadow-xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-100">
                              {m.name?.charAt(0) || 'م'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-black text-slate-900 leading-tight">{m.name}</p>
                              <p className="truncate text-[11px] font-semibold text-slate-500 mt-0.5">
                                {m.team_name ? `فريق: ${m.team_name}` : 'مدير بدون فريق'}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-end">
                            {m.phone && <p className="text-[11px] font-semibold text-slate-600" dir="ltr">{m.phone}</p>}
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                              اختيار
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODE 2: Unregistered / New Client */}
          {clientType === 'unregistered' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="اسم الزبون" required>
                  <FieldInput icon={User} value={form.guest_name} onChange={(e) => setForm((f) => ({ ...f, guest_name: e.target.value }))} placeholder="أدخل اسم الزبون الكامل" />
                </Field>
                <Field label="هاتف الزبون (أو البريد)" hint="أدخل الهاتف أو البريد الإلكتروني للتواصل مع الزبون">
                  <FieldInput icon={Phone} value={form.guest_phone} onChange={(e) => setForm((f) => ({ ...f, guest_phone: e.target.value }))} placeholder="06XXXXXXXX" />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="ايميل الزبون (اختياري)">
                  <FieldInput icon={Mail} value={form.guest_email} onChange={(e) => setForm((f) => ({ ...f, guest_email: e.target.value }))} placeholder="client@example.com" />
                </Field>
              </div>
            </div>
          )}

          {/* Notes is always available */}
          <Field label="ملاحظات (اختياري)">
            <FieldInput value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="أي تفاصيل أو ملاحظات خاصة بالحجز..." />
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
