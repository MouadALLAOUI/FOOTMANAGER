import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Check, Percent } from 'lucide-react'
import api from '../../../api/client'
import { toastApiError } from '../../../lib/errors'
import { Button, Empty, SectionTitle } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import Calendar from '../../../components/ui/Calendar/Calendar'
import BookingDrawer from '../components/BookingDrawer'
import PendingBookingsCard from '../components/PendingBookingsCard'
import GuestBookingModal from '../components/GuestBookingModal'
import ClosureDrawer from '../components/ClosureDrawer'
import { useTerrainCalendar } from './useTerrainCalendar'

export default function TerrainCalendarPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const {
    calendar,
    terrains,
    loadingTerrains,
    terrainId,
    selectedTerrain,
    selectedDate,
    setSelectedDate,
    selectTerrain,
    nextWeek,
    previousWeek,
    goToToday,
    loading,
    error,
    refresh,
  } = useTerrainCalendar()

  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showGuestModal, setShowGuestModal] = useState(false)
  const [closureSlot, setClosureSlot] = useState(null)

  const bookedThisWeek = useMemo(
    () => (calendar ? calendar.slots.filter((s) => s.status === 'booked' || s.status === 'pending').length : 0),
    [calendar],
  )

  const occupancy = useMemo(() => {
    const total = bookedThisWeek + (calendar?.stats.empty_slots || 0)
    return total ? Math.round((bookedThisWeek / total) * 100) : 0
  }, [bookedThisWeek, calendar])

  const statCards = [
    { label: 'حجوزات الأسبوع', value: bookedThisWeek, icon: CalendarDays, color: 'from-sky-500 to-sky-400' },
    { label: 'اشتراكات نشطة', value: calendar?.stats.active_subscriptions || 0, icon: Check, color: 'from-green-500 to-emerald-400' },
    { label: 'نسبة الإشغال', value: `${occupancy}%`, icon: Percent, color: 'from-violet-500 to-purple-400' },
  ]

  const act = useCallback(
    async (fn, success) => {
      setBusy(true)
      try {
        const r = await fn()
        toast.success(success)
        const wa = r?.data?.whatsapp_notification_url || r?.whatsapp_notification_url
        setSelected(null)
        refresh()
        if (wa) window.open(wa, '_blank')
        return true
      } catch (e) {
        toastApiError(e, t)
        return false
      } finally {
        setBusy(false)
      }
    },
    [toast, refresh, t],
  )

  const approveBooking = useCallback((id) => act(() => api.put(`/owner/bookings/${id}/approve`), 'تم قبول الحجز'), [act])
  const rejectBooking = useCallback((id) => act(() => api.put(`/owner/bookings/${id}/reject`), 'تم رفض الحجز'), [act])

  const confirm = useConfirm()
  const confirmReject = useCallback(
    (id) => {
      if (!id) return
      confirm.run(() => rejectBooking(id), {
        title: 'رفض الحجز؟',
        description: 'سيتم رفض هذا الحجز ولن يكون الموعد متاحًا للمسير.',
        confirmLabel: 'رفض الحجز',
      })
    },
    [confirm, rejectBooking],
  )

  const onSlotClick = useCallback(
    (slot) => {
      if (slot.metadata.isPast) return
      if (slot.status === 'closed') {
        toast.info(slot.metadata.closureReason ? `مغلق: ${slot.metadata.closureReason}` : 'هذا الموعد مغلق')
        return
      }
      if (slot.status === 'available') {
        setClosureSlot({ date: slot.date, startTime: slot.startTime })
        return
      }
    },
    [toast],
  )

  const onEventClick = useCallback((event) => {
    if (event.metadata?.rawBooking) setSelected(event.metadata.rawBooking)
  }, [])

  const handleGoToToday = useCallback(() => {
    goToToday()
  }, [goToToday])

  const hasNoTerrains = terrains.length === 0 && !loadingTerrains

  return (
    <div>
      <SectionTitle title="تقويم الحجوزات" subtitle="عرض الأسبوع وإدارة المواعيد والقرارات" />

      <div className="mb-5">
        {loadingTerrains ? (
          <div className="h-11 w-full max-w-md animate-pulse rounded-2xl bg-slate-200" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {terrains.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTerrain(t.id)}
                className={`rounded-2xl border px-4 py-2 text-sm font-bold transition-all ${terrainId === t.id
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
              >
                {t.name}
                <span className={`ms-2 text-[10px] ${t.is_open === false ? 'text-red-400' : 'text-green-500'}`}>
                  {t.is_open === false ? 'مغلق' : 'مفتوح'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 flex items-center justify-end">
        <Button size="sm" onClick={() => setShowGuestModal(true)}>
          إنشاء حجز زائر
        </Button>
      </div>

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="flex items-center gap-2 text-xs font-bold text-rose-600">{error}</p>
          <Button size="sm" variant="dangerSoft" onClick={refresh}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${s.color} text-white`}>
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-black leading-6 text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {hasNoTerrains ? (
        <Empty title={t('terrain.empty.noCalendarTerrains')} description={t('terrain.empty.noCalendarTerrainsDesc')} />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
          <div className="min-w-0">
            <Calendar
              loading={loading || (!calendar && !error)}
              days={calendar?.days || []}
              slots={calendar?.slots || []}
              events={calendar?.events || []}
              title={calendar?.terrain?.name || selectedTerrain?.name}
              periodLabel={calendar?.periodLabel || ''}
              selectedDate={selectedDate}
              onPrevious={previousWeek}
              onNext={nextWeek}
              onToday={handleGoToToday}
              onDaySelect={(day) => setSelectedDate(typeof day === 'string' ? day : day.date)}
              onSlotClick={onSlotClick}
              onEventClick={onEventClick}
            />
          </div>

          <div className="min-w-0 xl:max-h-[calc(100dvh-7.5rem)] xl:overflow-y-auto">
            <PendingBookingsCard
              bookings={calendar?.pendingBookings || []}
              busy={busy}
              onView={(b) => setSelected(b.metadata.rawBooking)}
              onApprove={approveBooking}
              onReject={confirmReject}
            />
          </div>
        </div>
      )}

      <BookingDrawer
        booking={selected}
        onClose={() => setSelected(null)}
        onApprove={() => selected && approveBooking(selected.id)}
        onReject={() => selected && confirmReject(selected.id)}
        busy={busy}
      />

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={confirm.options.title}
        description={confirm.options.description}
        confirmLabel={confirm.options.confirmLabel}
        cancelLabel={confirm.options.cancelLabel}
        tone={confirm.options.tone}
        onConfirm={confirm.confirm}
        onClose={confirm.close}
      />

      <GuestBookingModal
        open={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        terrainId={selectedTerrain?.id || terrainId}
        terrainName={selectedTerrain?.name}
        date={selectedDate || new Date().toISOString().slice(0, 10)}
        refresh={refresh}
      />

      <ClosureDrawer
        open={Boolean(closureSlot)}
        onClose={() => setClosureSlot(null)}
        terrainId={selectedTerrain?.id || terrainId}
        terrainName={selectedTerrain?.name}
        date={closureSlot?.date}
        startTime={closureSlot?.startTime}
        onSaved={refresh}
      />
    </div>
  )
}