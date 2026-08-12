import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, CalendarX2, MapPin, Swords } from 'lucide-react'
import api from '../../../api/client'
import { Button, Empty } from '../../../components/dashboard/ui'
import { useCommandCenter } from '../components/CommandCenterContext'
import { Section, bookingTypeLabels, formatDate } from '../components/shared'

export default function BookingsPanel() {
  const { t } = useTranslation()
  const { toast, reload, upcomingBookings, setBooking, setCreateOpen } = useCommandCenter()

  const upcoming = useMemo(
    () => [...(upcomingBookings || [])].sort((a, b) => new Date(a.booking_date) - new Date(b.booking_date)).slice(0, 5),
    [upcomingBookings],
  )

  const cancel = async (b) => {
    if (!window.confirm(t('ov.bookings.cancelConfirm'))) return
    try {
      await api.delete(`/manager/bookings/${b.id}`)
      toast.success(t('ov.bookings.cancelled'))
      reload()
    } catch {
      toast.error(t('ov.bookings.cancelFailed'))
    }
  }

  return (
    <Section
      id="bookings"
      icon={CalendarDays}
      tint="sky"
      title={t('ov.bookings.title')}
      subtitle={t('ov.bookings.subtitle')}
      badge={
        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-600 ring-1 ring-sky-200">
          {upcoming.length}
        </span>
      }
    >
      {upcoming.length === 0 ? (
        <Empty title={t('ov.bookings.emptyTitle')} description={t('ov.bookings.emptyDesc')} />
      ) : (
        <div className="space-y-2">
          {upcoming.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition-colors hover:border-sky-200"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600">
                <CalendarDays className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900">{b.terrain?.name || t('ov.common.terrain')}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-slate-400">
                  <span>{formatDate(b.booking_date)}</span>
                  <span className="text-slate-300">•</span>
                  <span>
                    {b.start_time} - {b.end_time}
                  </span>
                  {b.terrain?.city && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3 text-green-500" />
                        {b.terrain.city}
                      </span>
                    </>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {typeof b.price === 'number' && b.price > 0 && (
                  <span className="ms-1 text-xs font-black text-slate-700">
                    {b.price}
                    <span className="ms-0.5 text-[10px] font-bold text-slate-400">{t('ov.common.currency')}</span>
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                  {bookingTypeLabels[b.booking_type] && t('ov.bookingTypes.' + b.booking_type) || bookingTypeLabels[b.booking_type] || b.booking_type || t('ov.common.booking')}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setBooking(b)}>
                  {t('ov.common.details')}
                </Button>
                <Button size="sm" variant="soft" title={t('ov.bookings.convertToMatch')} onClick={() => setCreateOpen({ fromBooking: b })}>
                  <Swords className="size-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-50" title={t('ov.common.cancel')} onClick={() => cancel(b)}>
                  <CalendarX2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
