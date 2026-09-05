import i18n from '../../../i18n'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Plus,
  Repeat,
  Swords,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useManagerBookings, useStadiums } from '../../../api/queries'
import { mapHttpError } from '../../../lib/errorState'
import { toastApiError } from '../../../lib/errors'
import { SectionError } from '../../../components/errors'
import {
  Button,
  Empty,
  Field,
  FieldRow,
  Modal,
  SectionTitle,
  SkeletonCards,
  StatusBadge,
  inputClass,
  selectClass,
} from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { BookingCard } from '../../../components/dashboard/cards'
import { useToast } from '../../../components/ui/Toast'
import TimeSlotPicker from '../../../components/TimeSlotPicker'
import useTerrainSlots from '../../../hooks/useTerrainSlots'

const typeLabels = { get training() { return i18n.t('dash.training') }, get private() { return i18n.t('dash.privateBooking') }, get match() { return i18n.t('dash.match') } }
const dayLabels = { get 0() { return i18n.t('dash.sunday') }, get 1() { return i18n.t('dash.monday') }, get 2() { return i18n.t('dash.tuesday') }, get 3() { return i18n.t('dash.wednesday') }, get 4() { return i18n.t('dash.thursday') }, get 5() { return i18n.t('dash.friday') }, get 6() { return i18n.t('dash.saturday') } }
const categoryTabs = () => [
  { key: 'upcoming', label: i18n.t('dash.upcoming') },
  { key: 'past', label: i18n.t('dash.past') },
  { key: 'cancelled', label: i18n.t('dash.cancelled2') },
  { key: 'all', label: i18n.t('dash.all') },
]
const typeTabs = () => [
  { key: 'all', label: i18n.t('dash.all') },
  { key: 'training', label: i18n.t('dash.training') },
  { key: 'private', label: i18n.t('dash.privateBooking') },
  { key: 'weekly', label: i18n.t('dash.weeklySubscription') },
]
const subscriptionStatusLabels = {
  get active() { return i18n.t('dash.active') },
  get expired() { return i18n.t('dash.ended') },
  get inactive() { return i18n.t('dash.inactive') },
  not_subscription: '',
}

function NewBookingModal({ open, onClose, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: stadiumsData } = useStadiums({ per_page: 50 }, { enabled: open })
  const [form, setForm] = useState({
    terrain_id: '',
    booking_type: 'training',
    reservation_type: 'single',
    booking_date: '',
    day_of_week: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const { availableStartTimes, disabledStartTimes, loading, closed, closedReason } = useTerrainSlots(form.terrain_id, form.booking_date)

  const stadiums = stadiumsData?.data || []

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const isWeekly = form.reservation_type === 'weekly_subscription'
  const endAvail = form.start_time ? availableStartTimes.filter((s) => s > form.start_time) : availableStartTimes
  const endDisabled = form.start_time ? disabledStartTimes.filter((s) => s > form.start_time) : disabledStartTimes

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const payload = {
        terrain_id: Number(form.terrain_id),
        booking_type: form.booking_type,
        reservation_type: form.reservation_type,
        start_time: form.start_time,
        end_time: form.end_time,
        notes: form.notes || undefined,
        ...(isWeekly
          ? { day_of_week: Number(form.day_of_week), start_date: form.start_date, end_date: form.end_date || undefined }
          : { booking_date: form.booking_date }),
      }
      const res = await api.post('/manager/bookings/training', payload)
      toast.success(res.data.message || t('dash.bookingRequestSent'))
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : e.response?.data?.message || t('dash.couldNotCreateTheBooking'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t('dash.newBooking')} subtitle={t('dash.bookAFieldForYourTeamTrainingOrMatch')} size="lg">
      <div className="space-y-4">
        <Field label={t('dash.field')} required>
          <select className={selectClass} value={form.terrain_id} onChange={set('terrain_id')}>
            <option value="">{t('dash.chooseAField')}</option>
            {stadiums.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.city} {s.price_per_team ? t('dash.perTeamPrice', { price: s.price_per_team }) : ''}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('dash.bookingType')}</span>
          <div className="flex gap-2">
            {[
              { value: 'training', label: t('dash.training') },
              { value: 'private', label: t('dash.privateBooking') },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, booking_type: t.value }))}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                  form.booking_type === t.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-bold text-slate-700">{t('dash.bookingSystem')}</span>
          <div className="flex gap-2">
            {[
              { value: 'single', label: t('dash.oneTimeBooking') },
              { value: 'weekly_subscription', label: t('dash.weeklySubscription') },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, reservation_type: t.value }))}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                  form.reservation_type === t.value
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {isWeekly ? (
          <FieldRow cols={3}>
            <Field label={t('dash.dayOfWeek')} required>
              <select className={selectClass} value={form.day_of_week} onChange={set('day_of_week')}>
                <option value="">{t('dash.chooseADay')}</option>
                {Object.entries(dayLabels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('dash.startDate')} required>
              <input type="date" className={inputClass} value={form.start_date} onChange={set('start_date')} />
            </Field>
            <Field label={t('dash.endDate')}>
              <input type="date" className={inputClass} value={form.end_date} onChange={set('end_date')} />
            </Field>
          </FieldRow>
        ) : (
          <Field label={t('dash.bookingDate')} required>
            <input type="date" className={inputClass} value={form.booking_date} onChange={set('booking_date')} />
          </Field>
        )}

        <FieldRow>
          <Field label={t('dash.startTime')} required>
            <TimeSlotPicker
              selectedTime={form.start_time}
              onChange={(v) => setForm((f) => ({ ...f, start_time: v }))}
              availableSlots={availableStartTimes}
              disabledSlots={disabledStartTimes}
              loading={loading}
              label={t('dash.startTime')}
              required
            />
          </Field>
          <Field label={t('dash.endTime')} required>
            <TimeSlotPicker
              selectedTime={form.end_time}
              onChange={(v) => setForm((f) => ({ ...f, end_time: v }))}
              availableSlots={endAvail}
              disabledSlots={endDisabled}
              loading={loading}
              label={t('dash.endTime')}
              required
              emptyText={closed ? closedReason || 'الملعب مغلق' : undefined}
            />
          </Field>
        </FieldRow>

        <Field label={t('dash.notes')}>
          <textarea rows={2} className={`${inputClass} h-auto py-3`} value={form.notes} onChange={set('notes')} />
        </Field>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? 'جارٍ الإرسال…' : t('dash.sendBookingRequest')}
        </Button>
      </div>
    </Modal>
  )
}

function CancelModal({ booking, onClose, onSaved }) {
  const { toast } = useToast()
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await api.post(`/manager/bookings/${booking.id}/request-cancel`, { reason: reason || undefined })
      toast.success(t('dash.cancellationRequestSentToTheFieldOwner'))
      onSaved()
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={t('dash.requestCancellation')} subtitle={`إلغاء حجز ${typeof booking.terrain?.name === 'string' ? booking.terrain.name : t('dash.field3')}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
          <Hourglass className="size-5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-slate-600">
            {t('dash.theCancellationRequestWillBeSentToTheFieldOwnerForReviewTheBookingStaysValidUntilTheyApproveIt')}
          </p>
        </div>
        <Field label={t('dash.cancellationReasonOptional')}>
          <textarea
            rows={3}
            className={`${inputClass} h-auto py-3`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('dash.eGScheduleConflict')}
          />
        </Field>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {t('dash.goBack')}
          </Button>
          <Button variant="danger" className="flex-1" disabled={busy} onClick={submit}>
            {busy ? 'جارٍ الإرسال…' : t('dash.sendRequest')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function BookingDetail({ booking, onClose, onCancel, onConvert }) {
  const { t } = useTranslation()
  const terrain = booking?.terrain && typeof booking.terrain === 'object' && !Array.isArray(booking.terrain) ? booking.terrain : {}
  const isWeekly = booking?.reservation_type === 'weekly_subscription'
  return (
    <Drawer open={Boolean(booking)} onClose={onClose} title={t('dash.bookingDetails')} subtitle={`حجز ${terrain.name || t('dash.field3')}`} size="460">
      {booking && (
        <div className="space-y-5">
          <div className="rounded-3xl bg-gradient-to-l from-[#0b1220] to-[#12321f] p-6 text-center text-white">
            {terrain.image_url ? (
              <img loading="lazy" decoding="async" src={terrain.image_url} alt="" className="mx-auto size-16 rounded-3xl object-cover ring-4 ring-white/10" />
            ) : (
              <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-white/10">
                <CalendarCheck className="size-8 text-green-400" />
              </span>
            )}
            <p className="mt-3 text-lg font-black">{typeof terrain.name === 'string' ? terrain.name : t('dash.field3')}</p>
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs font-semibold text-white/60">
              <MapPin className="size-3.5" />
              {typeof terrain.city === 'string' ? terrain.city : '—'} {typeof terrain.type === 'string' ? `• ${terrain.type}` : ''}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-600 ring-1 ring-violet-200">
              {isWeekly ? (
                <>
                  <Repeat className="size-3" />
                  {t('dash.weeklySubscription')}
                </>
              ) : (
                typeLabels[booking.booking_type] || booking.booking_type
              )}
            </span>
          </div>

          <div className="space-y-2.5">
            {[
              {
                icon: Clock,
                label: isWeekly ? t('dash.dayOfWeek') : t('dash.date'),
                value: isWeekly
                  ? t('dash.weeklyOn', { day: dayLabels[booking.day_of_week] || '—' })
                  : booking.booking_date
                    ? new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' })
                    : '—',
              },
              { icon: CalendarCheck, label: t('dash.time'), value: `${booking.start_time} - ${booking.end_time}` },
              { icon: Repeat, label: t('dash.type'), value: typeLabels[booking.booking_type] || booking.booking_type },
              { icon: Swords, label: t('dash.price'), value: `${booking.price} د.م` },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
                  <r.icon className="size-4" />
                </span>
                <div>
                  <p className="text-[10px] font-bold text-slate-400">{r.label}</p>
                  <p className="text-sm font-bold text-slate-800">{r.value}</p>
                </div>
              </div>
            ))}
          </div>

          {booking.notes && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-[10px] font-bold text-slate-400">{t('dash.notes')}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{booking.notes}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {booking.status === 'approved' && (
              <>
                <Button variant="dangerSoft" className="flex-1" onClick={() => onCancel(booking)}>
                  <XCircle className="size-4" />
                  {t('dash.cancelBooking')}
                </Button>
                <Button className="flex-1" onClick={() => onConvert(booking)}>
                  <Swords className="size-4" />
                  {t('dash.convertToMatch')}
                </Button>
              </>
            )}
            {booking.status === 'pending' && (
              <div className="w-full rounded-2xl bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-600">
                {t('dash.awaitingFieldOwnerConfirmation')}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

export default function Bookings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [category, setCategory] = useState('upcoming')
  const [type, setType] = useState('all')
  const [newOpen, setNewOpen] = useState(false)
  const [cancelBooking, setCancelBooking] = useState(null)
  const [detail, setDetail] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const { data, isLoading: loading, error, refetch } = useManagerBookings({ filter: category })
  const errorState = error ? mapHttpError(error) : null

  const bookings = data?.bookings || []
  const counts = data?.counts && typeof data.counts === 'object' && !Array.isArray(data.counts) ? data.counts : {}

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        const matchType =
          type === 'all' || (type === 'weekly' ? b.reservation_type === 'weekly_subscription' : b.booking_type === type)
        return matchType
      }),
    [bookings, type],
  )

  const convert = async (b) => {
    if (!window.confirm(t('dash.convertThisBookingIntoAMatchRequestLookingForAnOpponent'))) return
    setBusyId(b.id)
    try {
      const res = await api.post(`/manager/match-requests/from-booking/${b.id}`)
      toast.success(res.data.message || t('dash.matchRequestCreated'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyId(null)
    }
  }

  const actionsFor = (b) => {
    if (category === 'past' || category === 'cancelled') {
      return (
        <span className="text-[11px] font-bold text-slate-400">
          {category === 'past' ? 'تمت هذه الحجز' : t('dash.thisBookingWasCancelled')}
        </span>
      )
    }

    return (
      <>
        {b.status === 'approved' && (
          <>
            <Button size="sm" variant="dangerSoft" onClick={() => setCancelBooking(b)}>
              <XCircle className="size-3.5" />
              {t('dash.cancelBooking')}
            </Button>
            <Button size="sm" disabled={busyId === b.id} onClick={() => convert(b)}>
              <Swords className="size-3.5" />
              {t('dash.convertToMatch')}
            </Button>
          </>
        )}
        {b.status === 'pending' && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-500">
            <Hourglass className="size-3.5" />
            {t('dash.awaitingFieldOwnerConfirmation')}
          </span>
        )}
      </>
    )
  }

  return (
    <div>
      <SectionTitle
        title={t('dash.myBookings')}
        subtitle={t('dash.fieldBookingsForYourTeam')}
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" />
            {t('dash.newBooking')}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t('dash.upcoming'), value: Number(counts.upcoming) || 0, icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-50' },
          { label: t('dash.past'), value: Number(counts.past) || 0, icon: Clock, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: t('dash.cancelled2'), value: Number(counts.cancelled) || 0, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: t('dash.all'), value: Number(counts.all) || 0, icon: CalendarPlus, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-3">
              <span className={`grid size-11 place-items-center rounded-2xl ${s.bg} ${s.color}`}>
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-black text-slate-900">{s.value}</p>
                <p className="text-xs font-semibold text-slate-400">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {categoryTabs().map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setCategory(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              category === t.key
                ? 'bg-slate-900 text-white shadow'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {t.label}
            <span
              className={`grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-black ${
                category === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {Number(counts[t.key]) || 0}
            </span>
          </button>
        ))}
        <span className="mx-1 w-px bg-slate-200" />
        {typeTabs().map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setType(t.key)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition-all ${
              type === t.key
                ? 'bg-green-500 text-white shadow'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorState ? (
        <div className="mt-6">
          <SectionError state={errorState} onRetry={refetch} />
        </div>
      ) : loading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SkeletonCards count={4} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <Empty
            icon={CalendarPlus}
            title={t('dash.noBookingsInThisCategory')}
            description={t('dash.bookFieldsForYourTeamTrainingAndMatches')}
            action={
              type === 'all' && (
                <Button size="sm" onClick={() => setNewOpen(true)}>
                  <Plus className="size-3.5" />
                  {t('dash.newBooking')}
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.map((b) => (
            <div key={b.id} onClick={() => setDetail(b)} className="cursor-pointer">
              <BookingCard booking={b} actions={actionsFor(b)} />
            </div>
          ))}
        </div>
      )}

      <NewBookingModal open={newOpen} onClose={() => setNewOpen(false)} onSaved={refetch} />
      {cancelBooking && (
        <CancelModal booking={cancelBooking} onClose={() => setCancelBooking(null)} onSaved={refetch} />
      )}
      <BookingDetail
        booking={detail}
        onClose={() => setDetail(null)}
        onCancel={(b) => {
          setCancelBooking(b)
          setDetail(null)
        }}
        onConvert={(b) => {
          setDetail(null)
          convert(b)
        }}
      />
    </div>
  )
}
