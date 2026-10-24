import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CheckCircle2, Sparkles, Clock, MapPin, Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import Drawer from '../../../components/dashboard/Drawer'
import { Field, FieldRow, Button, inputClass, selectClass } from '../../../components/dashboard/ui'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import TimeSlotPicker from '../../../components/TimeSlotPicker'
import useTerrainSlots from '../../../hooks/useTerrainSlots'
import { buildTimeSlots } from '../../../lib/timeSlots'
import OverrideWarningModal from './OverrideWarningModal'

export default function RescheduleDrawer({ fixture, tournament, stadiums, onClose, onSaved, onConfirmed }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const integrated = (tournament.terrain_reservation_mode ?? 'independent') === 'integrated'
  const [busy, setBusy] = useState(false)
  const [busyConfirm, setBusyConfirm] = useState(false)
  const [warningModalData, setWarningModalData] = useState(null)
  const [nearestSlot, setNearestSlot] = useState(null)
  const [loadingNearest, setLoadingNearest] = useState(false)

  useEffect(() => {
    if (!fixture?.id || !tournament?.id) return
    let isMounted = true
    setLoadingNearest(true)
    api
      .get(`/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/postpone-suggestions`)
      .then((res) => {
        if (isMounted) {
          const slots = res.data?.data || []
          if (slots.length > 0) {
            setNearestSlot(slots[0])
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingNearest(false)
      })
    return () => {
      isMounted = false
    }
  }, [fixture?.id, tournament?.id])

  const applyNearestSlot = () => {
    if (!nearestSlot) return
    setForm((prev) => ({
      ...prev,
      date: nearestSlot.date,
      time: nearestSlot.time ? nearestSlot.time.slice(0, 5) : prev.time,
      stadium_id: nearestSlot.stadium_id || nearestSlot.stadium?.id || prev.stadium_id,
    }))
    toast.info('تم تطبيق أقرب موعد متاح في الخانات أدناه')
  }
  const initialDate = fixture.scheduled_at ? fixture.scheduled_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const initialTime = fixture.scheduled_at ? fixture.scheduled_at.slice(11, 16) : '20:00'
  const [form, setForm] = useState({ date: initialDate, time: initialTime, stadium_id: fixture.stadium?.id ?? '' })

  const { availableStartTimes, disabledStartTimes, loading } = useTerrainSlots(
    form.stadium_id || null,
    form.date || null,
    { excludeFixtureId: fixture?.id, excludeBookingId: fixture?.reservation?.active_reservation_id }
  )
  const avail = form.stadium_id && availableStartTimes.length ? availableStartTimes : buildTimeSlots('08:00', '23:00', 30)
  const dis = form.stadium_id ? disabledStartTimes : []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const payload = () => ({
    scheduled_at: `${form.date}T${form.time}:00`,
    stadium_id: form.stadium_id || undefined,
  })

  const save = async (override = false) => {
    setBusy(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}`, {
        ...payload(),
        override_warnings: override,
      })
      toast.success(integrated ? 'تم حفظ المسودة' : 'تم إعادة جدولة المباراة')
      setWarningModalData(null)
      onSaved()
    } catch (e) {
      if (e.response?.data?.requires_override) {
        setWarningModalData({
          title: e.response.data.warning_title || 'تحذير في برمجة المباراة',
          message: e.response.data.message,
          affectedTeam: e.response.data.affected_team,
          action: 'save',
        })
      } else {
        toastApiError(e, t, 'تعذر إعادة الجدولة')
      }
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (override = false) => {
    setBusyConfirm(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}`, {
        ...payload(),
        override_warnings: override,
      })
      await api.post(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/confirm-reservation`, {
        override_warnings: override,
      })
      toast.success('تم حفظ وتأكيد حجز الملعب')
      setWarningModalData(null)
      if (onConfirmed) {
        onConfirmed()
      } else {
        onSaved()
      }
    } catch (e) {
      if (e.response?.data?.requires_override) {
        setWarningModalData({
          title: e.response.data.warning_title || 'تحذير في برمجة المباراة',
          message: e.response.data.message,
          affectedTeam: e.response.data.affected_team,
          action: 'confirm',
        })
      } else {
        toastApiError(e, t, 'تعذر تأكيد الحجز')
      }
    } finally {
      setBusyConfirm(false)
    }
  }

  return (
    <>
      <Drawer open onClose={onClose} title="إعادة جدولة المباراة" subtitle="اختر تاريخًا ووقتًا جديدًا للمباراة">
        <div className="space-y-5">
          {/* Top Banner: Nearest Available Slot */}
          {loadingNearest ? (
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-400">
              <Loader2 className="size-4 animate-spin text-emerald-600" />
              <span>جاري فحص أقرب موعد متاح للمباراة...</span>
            </div>
          ) : nearestSlot ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-emerald-950">
                  <Sparkles className="size-4 text-emerald-600" />
                  <span>أقرب موعد متاح ومؤهل للمباراة:</span>
                </div>
                <span className="rounded bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-black">
                  مقترح ذكي ⭐
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-700 font-bold">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-white px-2 py-0.5 border border-emerald-100 text-slate-900">
                    {nearestSlot.day_name ? `${nearestSlot.day_name} • ` : ''}{nearestSlot.date}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Clock className="size-3 text-slate-400" />
                    {nearestSlot.time}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin className="size-3 text-slate-400" />
                    {nearestSlot.stadium_name || nearestSlot.stadium?.name}
                  </span>
                </div>
                <Button
                  size="sm"
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black h-7 px-2.5 shadow-2xs"
                  onClick={applyNearestSlot}
                >
                  تطبيق الموعد
                </Button>
              </div>
              {nearestSlot.has_rest_warning && (
                <div className="text-[10px] font-bold text-amber-800 bg-amber-100/70 rounded-lg p-1.5 flex items-center gap-1">
                  <span>⚠️ {nearestSlot.warning_message || 'تنبيه: تعارض جزئي مع فترة الراحة المحددة'}</span>
                </div>
              )}
            </div>
          ) : null}
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
                <Button variant="outline" className="flex-1" loading={busy} onClick={() => save(false)}>
                  <CalendarDays className="size-4" />
                  حفظ المسودة
                </Button>
                <Button className="flex-1" loading={busyConfirm} onClick={() => confirm(false)}>
                  <CheckCircle2 className="size-4" />
                  حفظ وتأكيد الحجز
                </Button>
              </>
            ) : (
              <Button className="flex-1" loading={busy} onClick={() => save(false)}>
                <CalendarDays className="size-4" />
                حفظ
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={onClose}>إلغاء</Button>
          </div>
        </div>
      </Drawer>

      <OverrideWarningModal
        isOpen={Boolean(warningModalData)}
        onClose={() => setWarningModalData(null)}
        onConfirm={() => {
          if (warningModalData?.action === 'confirm') {
            confirm(true)
          } else {
            save(true)
          }
        }}
        warningTitle={warningModalData?.title}
        warningMessage={warningModalData?.message}
        affectedTeam={warningModalData?.affectedTeam}
        busy={busy || busyConfirm}
      />
    </>
  )
}
