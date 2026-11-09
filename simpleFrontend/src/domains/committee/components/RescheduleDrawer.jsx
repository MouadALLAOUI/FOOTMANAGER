import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Layers,
  Loader2,
  MapPin,
  Play,
  Sparkles,
  Trophy,
} from 'lucide-react'
import Drawer from '../../../components/dashboard/Drawer'
import { Button } from '../../../components/dashboard/ui'
import { TeamAvatar } from '../../../pages/tournaments/shared'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { formatGroupName } from '../../../lib/groupNames'
import TimeSlotPicker from '../../../components/TimeSlotPicker'
import useTerrainSlots from '../../../hooks/useTerrainSlots'
import { buildTimeSlots } from '../../../lib/timeSlots'
import OverrideWarningModal from './OverrideWarningModal'

export default function RescheduleDrawer({
  fixture,
  tournament,
  stadiums,
  onClose,
  onSaved,
  onConfirmed,
  onOpenResult,
  isOpeningMatch = false,
  onToggleOpeningMatch,
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const integrated = (tournament.terrain_reservation_mode ?? 'independent') === 'integrated'
  const [busy, setBusy] = useState(false)
  const [busyConfirm, setBusyConfirm] = useState(false)
  const [warningModalData, setWarningModalData] = useState(null)
  const [nearestSlot, setNearestSlot] = useState(null)
  const [loadingNearest, setLoadingNearest] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)

  const isPlayed = fixture.status === 'played' || fixture.match?.status === 'finished'
  const isLive = ['kickoff', 'first_half', 'halftime', 'second_half', 'extra_time', 'penalties'].includes(
    fixture.match?.status,
  )
  const [statusChoice, setStatusChoice] = useState(
    isPlayed ? 'completed' : isLive ? 'live' : 'scheduled',
  )
  const [homeScore, setHomeScore] = useState(
    fixture.match?.home_score != null ? String(fixture.match.home_score) : '',
  )
  const [awayScore, setAwayScore] = useState(
    fixture.match?.away_score != null ? String(fixture.match.away_score) : '',
  )

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

  const initialDate = fixture.scheduled_at
    ? fixture.scheduled_at.slice(0, 10)
    : new Date().toISOString().slice(0, 10)
  const initialTime = fixture.scheduled_at ? fixture.scheduled_at.slice(11, 16) : '18:00'
  const [form, setForm] = useState({
    date: initialDate,
    time: initialTime,
    stadium_id: fixture.stadium?.id ?? '',
  })

  const { availableStartTimes, disabledStartTimes, loading } = useTerrainSlots(
    form.stadium_id || null,
    form.date || null,
    { excludeFixtureId: fixture?.id, excludeBookingId: fixture?.reservation?.active_reservation_id },
  )
  const avail =
    form.stadium_id && availableStartTimes.length
      ? availableStartTimes
      : buildTimeSlots('08:00', '23:00', 30)
  const dis = form.stadium_id ? disabledStartTimes : []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const payload = () => ({
    scheduled_at: `${form.date}T${form.time}:00`,
    stadium_id: form.stadium_id || undefined,
  })

  const formattedArabicDate = (() => {
    if (!form.date) return 'اختر التاريخ'
    try {
      const d = new Date(`${form.date}T12:00:00`)
      if (isNaN(d.getTime())) return form.date
      return d.toLocaleDateString('ar-EG-u-nu-latn', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return form.date
    }
  })()

  const groupOrRoundLabel = fixture.group?.name
    ? formatGroupName(fixture.group.name, { groupId: fixture.group.id, tournamentId: tournament?.id })
    : fixture.round?.name || (fixture.matchday ? `الجولة ${fixture.matchday}` : 'دور المجموعات')

  const save = async (override = false) => {
    setBusy(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}`, {
        ...payload(),
        override_warnings: override,
      })
      toast.success(integrated ? 'تم حفظ المسودة' : 'تم حفظ تعديلات المباراة بنجاح')
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
        toastApiError(e, t, 'تعذر حفظ تعديلات المباراة')
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
      <Drawer
        open
        onClose={onClose}
        title="تفاصيل المباراة"
        subtitle="تعديل موعد المباراة أو الملعب أو حالة المواجهة"
      >
        <div className="space-y-3.5" dir="rtl">
          {/* 1. Opening Match Toggle + Team A vs Team B Card (Matches Reference Image 1 Right Screen) */}
          <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 space-y-4 shadow-2xs">
            {/* Opening Match Toggle Row */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 px-3 py-1 text-xs font-black text-[#111313] dark:text-[#D0FF38]">
                <Trophy className="size-3.5" />
                <span>المباراة الافتتاحية</span>
              </span>

              <button
                type="button"
                role="switch"
                aria-checked={isOpeningMatch}
                onClick={() => onToggleOpeningMatch?.(fixture.id)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  isOpeningMatch
                    ? 'bg-[#1F9D55] dark:bg-[#30D158]'
                    : 'bg-[#E1E5DF] dark:bg-[#303832]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    isOpeningMatch ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Teams Row */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 pt-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="truncate text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                  {fixture.home_team?.name || 'الفريق الأول'}
                </span>
                <TeamAvatar team={fixture.home_team} className="size-9 shrink-0" />
              </div>

              <span className="rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-1 text-xs font-black text-[#65706A] dark:text-[#B2B9B3]">
                VS
              </span>

              <div className="flex items-center justify-end gap-2.5 min-w-0">
                <TeamAvatar team={fixture.away_team} className="size-9 shrink-0" />
                <span className="truncate text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                  {fixture.away_team?.name || 'الفريق الثاني'}
                </span>
              </div>
            </div>
          </div>

          {/* Nearest Available Slot Suggestion Banner */}
          {loadingNearest ? (
            <div className="flex items-center gap-2 rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] border border-[#E1E5DF] dark:border-[#303832] p-3 text-xs text-[#65706A] dark:text-[#B2B9B3]">
              <Loader2 className="size-4 animate-spin text-[#1F9D55] dark:text-[#D0FF38]" />
              <span>جاري فحص أقرب موعد متاح للمباراة...</span>
            </div>
          ) : nearestSlot ? (
            <div className="rounded-2xl border border-[#B8F000] dark:border-[#D0FF38]/40 bg-[#B8F000]/15 dark:bg-[#D0FF38]/10 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                  <Sparkles className="size-4 text-[#1F9D55] dark:text-[#D0FF38]" />
                  <span>أقرب موعد متاح ومؤهل للمباراة:</span>
                </div>
                <span className="rounded-md bg-[#111313] dark:bg-[#D0FF38] text-white dark:text-[#111313] px-2 py-0.5 text-[10px] font-black">
                  مقترح ذكي
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#111313] dark:text-[#F5F7F2] font-bold">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg bg-white dark:bg-[#1B201D] px-2 py-0.5 border border-[#E1E5DF] dark:border-[#303832]">
                    {nearestSlot.day_name ? `${nearestSlot.day_name} • ` : ''}
                    {nearestSlot.date}
                  </span>
                  <span className="flex items-center gap-1 text-[#65706A] dark:text-[#B2B9B3]">
                    <Clock className="size-3" />
                    {nearestSlot.time}
                  </span>
                  <span className="flex items-center gap-1 text-[#65706A] dark:text-[#B2B9B3]">
                    <MapPin className="size-3" />
                    {nearestSlot.stadium_name || nearestSlot.stadium?.name}
                  </span>
                </div>
                <Button size="sm" type="button" onClick={applyNearestSlot}>
                  تطبيق الموعد
                </Button>
              </div>
            </div>
          ) : null}

          {/* 2. Interactive Rows: Date, Time, Stadium, Group */}
          <div className="space-y-2">
            {/* التاريخ */}
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-4 py-3 cursor-pointer hover:border-[#B8F000] transition">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                <CalendarDays className="size-4 text-[#65706A] dark:text-[#B2B9B3]" />
                <span>التاريخ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] hidden sm:inline">
                  {formattedArabicDate}
                </span>
                <input
                  type="date"
                  value={form.date}
                  onChange={set('date')}
                  className="rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-1 text-xs font-black text-[#111313] dark:text-[#F5F7F2] focus:outline-none"
                />
              </div>
            </label>

            {/* التوقيت */}
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] overflow-hidden">
              <button
                type="button"
                onClick={() => setTimePickerOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-start cursor-pointer hover:bg-[#F7F8F5]/60 dark:hover:bg-[#252B27]/50 transition"
              >
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                  <Clock className="size-4 text-[#65706A] dark:text-[#B2B9B3]" />
                  <span>التوقيت</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
                    {form.time}
                  </span>
                  <ChevronDown
                    className={`size-4 text-[#65706A] dark:text-[#B2B9B3] transition-transform ${
                      timePickerOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>
              {timePickerOpen && (
                <div className="border-t border-[#E1E5DF] dark:border-[#303832] p-3 bg-[#F7F8F5]/50 dark:bg-[#252B27]/40">
                  <TimeSlotPicker
                    selectedTime={form.time}
                    onChange={(v) => {
                      setForm((f) => ({ ...f, time: v }))
                      setTimePickerOpen(false)
                    }}
                    availableSlots={avail}
                    disabledSlots={dis}
                    loading={loading}
                    label="التوقيت"
                  />
                </div>
              )}
            </div>

            {/* الملعب */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-4 py-2.5">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] shrink-0">
                <MapPin className="size-4 text-[#65706A] dark:text-[#B2B9B3]" />
                <span>الملعب</span>
              </div>
              <select
                value={form.stadium_id}
                onChange={set('stadium_id')}
                className="max-w-[200px] rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-1.5 text-xs font-black text-[#111313] dark:text-[#F5F7F2] focus:outline-none"
              >
                <option value="">
                  {fixture.stadium?.name ? `${fixture.stadium.name} (الحالي)` : 'اختر الملعب'}
                </option>
                {(stadiums || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* المجموعة / الجولة */}
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-4 py-3">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                <Layers className="size-4 text-[#65706A] dark:text-[#B2B9B3]" />
                <span>المجموعة</span>
              </div>
              <span className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                {groupOrRoundLabel}
              </span>
            </div>
          </div>

          {/* 3. حالة المباراة (Match Status Selector Card) */}
          <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 space-y-2.5">
            <p className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
              حالة المباراة
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatusChoice('scheduled')}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  statusChoice === 'scheduled'
                    ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                    : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                }`}
              >
                <CalendarDays className="size-3.5" />
                <span>مبرمجة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusChoice('live')
                  if (onOpenResult) {
                    onClose()
                    onOpenResult(fixture)
                  }
                }}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  statusChoice === 'live'
                    ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                    : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                }`}
              >
                <Play className="size-3.5" />
                <span>جارية</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusChoice('completed')
                  if (onOpenResult) {
                    onClose()
                    onOpenResult(fixture)
                  }
                }}
                className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  statusChoice === 'completed'
                    ? 'bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs'
                    : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                }`}
              >
                <Check className="size-3.5 stroke-[2.8]" />
                <span>منجزة</span>
              </button>
            </div>
          </div>

          {/* 4. النتيجة (اختياري) Score Card */}
          <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                  النتيجة
                </span>
                <span className="text-xs font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                  (اختياري)
                </span>
              </div>
              {onOpenResult && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onOpenResult(fixture)
                  }}
                  className="text-xs font-black text-[#1F9D55] dark:text-[#D0FF38] hover:underline cursor-pointer"
                >
                  غرفة تحكم المباراة والأحداث ←
                </button>
              )}
            </div>

            <div className="flex items-center justify-center gap-3">
              <TeamAvatar team={fixture.home_team} className="size-9 shrink-0" />
              <input
                type="number"
                min="0"
                placeholder="—"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                className="h-11 w-16 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-center text-lg font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums focus:outline-none focus:border-[#B8F000]"
              />
              <span className="text-lg font-black text-[#65706A] dark:text-[#B2B9B3]">:</span>
              <input
                type="number"
                min="0"
                placeholder="—"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                className="h-11 w-16 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-center text-lg font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums focus:outline-none focus:border-[#B8F000]"
              />
              <TeamAvatar team={fixture.away_team} className="size-9 shrink-0" />
            </div>
          </div>

          {integrated && (
            <div className="rounded-xl border border-[#D97706]/30 bg-[#D97706]/10 px-4 py-2.5 text-xs font-semibold text-[#D97706] dark:text-[#F59E0B]">
              الحجز بنظام (بالتأكيد): حفظ التعديل يحفظه كمسودة دون حجز الملعب حتى تأكيد التعديل.
            </div>
          )}

          {/* 5. Sticky Bottom Lime CTA ("✓ حفظ التعديلات") */}
          <div className="sticky bottom-0 -mx-6 flex flex-col sm:flex-row gap-2 border-t border-[#E1E5DF] dark:border-[#303832] bg-white/95 dark:bg-[#1B201D]/95 px-6 py-4 backdrop-blur">
            {integrated ? (
              <>
                <button
                  type="button"
                  disabled={busy || busyConfirm}
                  onClick={() => confirm(false)}
                  className="flex-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#B8F000] dark:bg-[#D0FF38] text-sm font-black text-[#111313] shadow-xs transition active:scale-98 cursor-pointer"
                >
                  <CheckCircle2 className="size-4" />
                  <span>{busyConfirm ? 'جاري الحفظ...' : 'حفظ وتأكيد الحجز'}</span>
                </button>
                <button
                  type="button"
                  disabled={busy || busyConfirm}
                  onClick={() => save(false)}
                  className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-4 text-xs font-black text-[#111313] dark:text-[#F5F7F2] transition cursor-pointer"
                >
                  <CalendarDays className="size-4" />
                  <span>حفظ كمسودة</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => save(false)}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#B8F000] dark:bg-[#D0FF38] hover:opacity-95 text-sm sm:text-base font-black text-[#111313] shadow-xs transition active:scale-[0.99] cursor-pointer"
              >
                <Check className="size-5 stroke-[2.8]" />
                <span>{busy ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            )}
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
