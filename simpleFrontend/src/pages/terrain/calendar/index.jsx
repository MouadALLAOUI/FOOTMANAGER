import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Check, Percent, Plus } from 'lucide-react'
import api from '../../../api/client'
import { toastApiError } from '../../../lib/errors'
import { Button, Empty } from '../../../components/dashboard/ui'
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
  const [optimisticFreedIds, setOptimisticFreedIds] = useState(() => new Set())
  const [optimisticApprovedIds, setOptimisticApprovedIds] = useState(() => new Set())

  const effectiveCalendar = useMemo(() => {
    if (!calendar) return null
    if (!optimisticFreedIds.size && !optimisticApprovedIds.size) return calendar

    return {
      ...calendar,
      slots: (calendar.slots || []).map((slot) => {
        const bId = slot.booking_id || slot.booking?.id || slot.metadata?.rawBooking?.id
        if (bId && optimisticFreedIds.has(bId)) {
          return {
            ...slot,
            status: 'empty',
            booking_id: null,
            booking: null,
            team: null,
            title: null,
          }
        }
        if (bId && optimisticApprovedIds.has(bId)) {
          return {
            ...slot,
            status: 'booked',
          }
        }
        return slot
      }),
      pendingBookings: (calendar.pendingBookings || []).filter((b) => {
        const id = b.id || b.metadata?.rawBooking?.id
        return !optimisticFreedIds.has(id) && !optimisticApprovedIds.has(id)
      }),
    }
  }, [calendar, optimisticFreedIds, optimisticApprovedIds])

  const bookedThisWeek = useMemo(
    () => (effectiveCalendar ? effectiveCalendar.slots.filter((s) => s.status === 'booked' || s.status === 'pending').length : 0),
    [effectiveCalendar],
  )

  const occupancy = useMemo(() => {
    const total = bookedThisWeek + (effectiveCalendar?.stats.empty_slots || 0)
    return total ? Math.round((bookedThisWeek / total) * 100) : 0
  }, [bookedThisWeek, effectiveCalendar])

  const statCards = [
    { label: 'حجوزات الأسبوع', value: bookedThisWeek, icon: CalendarDays, color: 'from-sky-500 to-sky-600' },
    { label: 'اشتراكات نشطة', value: effectiveCalendar?.stats.active_subscriptions || 0, icon: Check, color: 'from-emerald-500 to-emerald-600' },
    { label: 'نسبة الإشغال', value: `${occupancy}%`, icon: Percent, color: 'from-violet-500 to-purple-600' },
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

  const approveBooking = useCallback(
    async (id) => {
      setOptimisticApprovedIds((prev) => new Set(prev).add(id))
      setSelected(null)
      toast.success('تم قبول الحجز بنجاح')
      try {
        const r = await api.put(`/owner/bookings/${id}/approve`)
        const wa = r?.data?.whatsapp_notification_url || r?.whatsapp_notification_url
        refresh()
        window.dispatchEvent(new CustomEvent('booking:updated'))
        if (wa) window.open(wa, '_blank')
        return true
      } catch (e) {
        setOptimisticApprovedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toastApiError(e, t)
        return false
      }
    },
    [toast, refresh, t],
  )

  const rejectBooking = useCallback(
    async (id) => {
      setOptimisticFreedIds((prev) => new Set(prev).add(id))
      setSelected(null)
      toast.success('تم رفض الحجز وتحرير الموعد')
      try {
        const r = await api.put(`/owner/bookings/${id}/reject`)
        const wa = r?.data?.whatsapp_notification_url || r?.whatsapp_notification_url
        refresh()
        window.dispatchEvent(new CustomEvent('booking:updated'))
        if (wa) window.open(wa, '_blank')
        return true
      } catch (e) {
        setOptimisticFreedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toastApiError(e, t)
        return false
      }
    },
    [toast, refresh, t],
  )

  const forceDeleteBooking = useCallback(
    async (id) => {
      setOptimisticFreedIds((prev) => new Set(prev).add(id))
      setSelected(null)
      toast.success('تم حذف الحجز إجبارياً وتحرير الموعد')
      try {
        await api.delete(`/owner/bookings/${id}/force`)
        refresh()
        window.dispatchEvent(new CustomEvent('booking:updated'))
        return true
      } catch (e) {
        setOptimisticFreedIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toastApiError(e, t)
        return false
      }
    },
    [toast, refresh, t],
  )

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
      if (slot.metadata?.isPast) return
      if (slot.status === 'closed') {
        toast.info(slot.metadata?.closureReason ? `مغلق: ${slot.metadata.closureReason}` : 'هذا الموعد مغلق')
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
    <div className="space-y-3.5">
      {/* Top Header Controls: Stadium selector tabs & Guest Booking button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {loadingTerrains ? (
          <div className="h-10 w-48 animate-pulse rounded-2xl bg-slate-200" />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {terrains.map((t) => {
              const active = terrainId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTerrain(t.id)}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-black transition-all ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                      : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className={`size-2 rounded-full ${t.is_open === false ? 'bg-rose-400' : active ? 'bg-white' : 'bg-emerald-500'}`} />
                  <span>{t.name}</span>
                  <span className={`text-[10px] font-bold ${active ? 'text-white/80' : t.is_open === false ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {t.is_open === false ? 'مغلق' : 'مفتوح'}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowGuestModal(true)}
          className="ms-auto inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white shadow-sm shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-95"
        >
          <Plus className="size-4" />
          <span>إنشاء حجز زائر</span>
        </button>
      </div>

      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5">
          <p className="flex items-center gap-2 text-xs font-bold text-rose-600">{error}</p>
          <Button size="sm" variant="dangerSoft" onClick={refresh}>
            إعادة المحاولة
          </Button>
        </div>
      )}

      {/* Compact KPI Bar (Height <= 70px, 3 items in a single row on mobile and desktop) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 max-h-[70px]">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-2 sm:gap-3 rounded-2xl border border-slate-200/80 bg-white px-2.5 py-2 sm:px-4 sm:py-2.5 shadow-xs"
          >
            <span className={`grid size-7 sm:size-8.5 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-xs`}>
              <s.icon className="size-3.5 sm:size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm sm:text-lg font-black leading-tight text-slate-900 truncate">{s.value}</p>
              <p className="truncate text-[10px] sm:text-xs font-semibold text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Smart Pending Bookings Section (Prominent alert if > 0, slim bar if 0) */}
      <PendingBookingsCard
        bookings={effectiveCalendar?.pendingBookings || []}
        busy={busy}
        onView={(b) => setSelected(b.metadata?.rawBooking || b)}
        onApprove={approveBooking}
        onReject={confirmReject}
      />

      {/* Calendar Grid (Full 100% Width) */}
      {hasNoTerrains ? (
        <Empty title={t('terrain.empty.noCalendarTerrains')} description={t('terrain.empty.noCalendarTerrainsDesc')} />
      ) : (
        <div className="w-full min-w-0">
          <Calendar
            loading={loading || (!effectiveCalendar && !error)}
            days={effectiveCalendar?.days || []}
            slots={effectiveCalendar?.slots || []}
            events={effectiveCalendar?.events || []}
            title={effectiveCalendar?.terrain?.name || selectedTerrain?.name}
            periodLabel={effectiveCalendar?.periodLabel || ''}
            selectedDate={selectedDate}
            onPrevious={previousWeek}
            onNext={nextWeek}
            onToday={handleGoToToday}
            onDaySelect={(day) => setSelectedDate(typeof day === 'string' ? day : day.date)}
            onSlotClick={onSlotClick}
            onEventClick={onEventClick}
          />
        </div>
      )}

      {/* Drawers & Dialogs */}
      <BookingDrawer
        booking={selected}
        onClose={() => setSelected(null)}
        onApprove={() => selected && approveBooking(selected.id)}
        onReject={() => selected && confirmReject(selected.id)}
        onForceDelete={forceDeleteBooking}
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
