import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Clock, Loader2, Check, MapPin, Banknote, Shield, Repeat } from 'lucide-react';
import api from '../../services/api';
import BookingSummaryModal from './BookingSummaryModal';
import WhatsAppNoticeModal from '../Booking/WhatsAppNoticeModal';

const TYPE_EMOJI = { minifoot: '⚽', salle: '🏟️', grass: '🌿', synthetic: '🟩', cement: '🧱' };

export default function SlotPickerModal({ terrain, flowType = 'direct', onClose, onBooked }) {
  const { t } = useTranslation();

  const TYPE_LABEL = { minifoot: t('terrain.minifoot'), salle: t('terrain.salle'), grass: t('terrain.grass'), synthetic: t('terrain.synthetic'), cement: t('terrain.cement') };
  const DAY_NAMES = [t('weekdays.sunday'), t('weekdays.monday'), t('weekdays.tuesday'), t('weekdays.wednesday'), t('weekdays.thursday'), t('weekdays.friday'), t('weekdays.saturday')];
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [purpose, setPurpose] = useState(flowType === 'amical' ? 'match' : 'training');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [bookedResult, setBookedResult] = useState(null);
  const [terrainClosed, setTerrainClosed] = useState(false);
  const [closureReason, setClosureReason] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  const [reservationType, setReservationType] = useState('single');
  const [subscriptionDuration, setSubscriptionDuration] = useState('1');

  useEffect(() => {
    fetchSlots();
    setSelectedSlot(null);
  }, [date]);

  const fetchSlots = async () => {
    setLoading(true);
    setError('');
    setTerrainClosed(false);
    setClosureReason(null);
    try {
      const res = await api.get(`/terrains/${terrain.id}/slots`, { params: { date } });
      if (res.data.terrain_closed) {
        setTerrainClosed(true);
        setClosureReason(res.data.closure_reason);
        setSlots([]);
      } else {
        setSlots(res.data.slots || []);
      }
    } catch {
      setError(t('common.error'));
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (slot) => {
    if (slot.status === 'available') {
      setSelectedSlot(slot);
    }
  };

  const handleSubmitClick = () => {
    if (!selectedSlot) return;
    setShowSummary(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const d = new Date(date + 'T00:00:00');
      let res;

      if (flowType === 'amical') {
        const payload = {
          stadium_id: terrain.id,
          match_datetime: `${date}T${selectedSlot.start}:00`,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          reservation_type: reservationType,
          notes: notes || null,
        };
        if (reservationType === 'weekly_subscription') {
          payload.day_of_week = d.getDay();
          payload.start_date = date;
          const months = parseInt(subscriptionDuration);
          const endDate = new Date(date + 'T00:00:00');
          endDate.setMonth(endDate.getMonth() + months);
          payload.end_date = endDate.toISOString().slice(0, 10);
        } else {
          payload.start_date = date;
        }
        res = await api.post('/manager/match-requests', payload);
      } else {
        const payload = {
          terrain_id: terrain.id,
          reservation_type: reservationType,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          purpose: purpose,
          notes: notes || null,
        };
        if (reservationType === 'single') {
          payload.booking_date = date;
        } else {
          payload.day_of_week = d.getDay();
          payload.start_date = date;
          const months = parseInt(subscriptionDuration);
          const endDate = new Date(date + 'T00:00:00');
          endDate.setMonth(endDate.getMonth() + months);
          payload.end_date = endDate.toISOString().slice(0, 10);
        }
        res = await api.post('/manager/direct-bookings', payload);
      }

      const submittedBooking = res.data.booking || res.data.match_request;

      setSlots((prev) => prev.map((s) => {
        if (s.start === selectedSlot.start && s.end === selectedSlot.end) {
          return {
            ...s,
            status: 'booked',
            booking: {
              ...submittedBooking,
              status: 'pending',
            },
          };
        }
        return s;
      }));

      setBookedResult({
        booking: submittedBooking,
        whatsappUrl: res.data.whatsapp_notification_url,
      });
      setShowSummary(false);
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedDayName = DAY_NAMES[new Date(date + 'T00:00:00').getDay()];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <span className="text-xl">{flowType === 'amical' ? '⚔️' : '🏟️'}</span>
            <div>
              <h2 className="text-lg font-black text-gray-800">
                {flowType === 'amical' ? t('booking.amicalMatch') : t('booking.directBooking')}
              </h2>
              <p className="text-[10px] text-gray-400">{t('terrain.pickSlotHint')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Terrain Info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{TYPE_EMOJI[terrain.type] || '⚽'}</span>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">{terrain.name}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={10} /> {terrain.city}
                  {terrain.player_format && (
                    <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{terrain.player_format}</span>
                  )}
                  <span className="text-gray-400">{TYPE_LABEL[terrain.type]}</span>
                </div>
              </div>
            </div>
            {terrain.price_per_team && (
              <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium">
                <Banknote size={11} /> {terrain.price_per_team} {t('booking.pricePerTeam')}
              </div>
            )}
          </div>

          {/* Reservation Type Toggle */}
          <div>
            <label className="block text-sm font-black text-gray-700 mb-2">{t('booking.type')}</label>
            <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setReservationType('single')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                  reservationType === 'single'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Calendar size={14} />
                🗓️ {t('booking.singleReservation')}
              </button>
              <button
                onClick={() => setReservationType('weekly_subscription')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                  reservationType === 'weekly_subscription'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Repeat size={14} />
                🔄 {t('booking.weeklySubscription')}
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">
              <Calendar size={14} className="inline ms-1" />
              {reservationType === 'single' ? t('booking.selectDate') : t('terrain.startDate')}
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Weekly Subscription Extras */}
          {reservationType === 'weekly_subscription' && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-black text-violet-700">
                <Repeat size={14} /> {t('booking.weeklySubscription')}
              </div>
              <p className="text-xs text-violet-600">
                {t('terrain.subscriptionNoteWeekly')} {selectedDayName} {t('terrain.forYouAndTeam')}
              </p>
              <div>
                <label className="block text-xs text-violet-600 mb-1">{t('booking.subscriptionDuration')}</label>
                <select
                  value={subscriptionDuration}
                  onChange={(e) => setSubscriptionDuration(e.target.value)}
                  className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none bg-white"
                >
                  <option value="1">{t('booking.month1')}</option>
                  <option value="3">{t('booking.month3')}</option>
                  <option value="6">{t('booking.month6')}</option>
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs text-violet-500 font-medium">
                <Banknote size={12} />
                <span>{t('booking.priceLabel')} {terrain.price_per_team ? terrain.price_per_team * parseInt(subscriptionDuration) : '—'} {t('common.currency')} / {subscriptionDuration} {t('booking.month')}</span>
              </div>
            </div>
          )}

          {/* Purpose Selection (direct only) */}
          {flowType === 'direct' && (
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">{t('booking.purpose')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPurpose('training')}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                    purpose === 'training'
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">🏃</span>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{t('booking.training')}</div>
                    <div className="text-[10px] text-gray-400">{t('terrain.trainingHint')}</div>
                  </div>
                </button>
                <button
                  onClick={() => setPurpose('private')}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 ${
                    purpose === 'private'
                      ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">🔒</span>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{t('booking.private')}</div>
                    <div className="text-[10px] text-gray-400">{t('terrain.privateHint')}</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* FullCalendar Slot Grid */}
          {terrainClosed ? (
            <div className="text-center py-8 bg-red-50 border-2 border-red-200 rounded-xl">
              <span className="text-4xl block mb-3">🔴</span>
              <p className="text-base font-black text-red-700">{t('terrain.terrainClosed')}</p>
              {closureReason && (
                <p className="text-sm text-red-500 mt-1">{t('terrain.closureReason')}: {closureReason}</p>
              )}
              <p className="text-xs text-red-400 mt-2">{t('terrain.noBookingWhileClosed')}</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-emerald-600" />
            </div>
          ) : error && slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">{t('booking.noSlots')}</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2">
                <Clock size={14} className="inline ms-1" />
                {t('terrain.availableSlots')} — {t('terrain.clickToSelect')}
              </label>
              <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                  const isAvailable = slot.status === 'available';
                  const isSubscription = slot.booking?.reservation_type === 'weekly_subscription';
                  const isPending = slot.booking?.status === 'pending';
                  const isBooked = !isAvailable;

                  let bgClass, borderClass, textClass, icon;
                  if (isSelected) {
                    bgClass = 'bg-emerald-500';
                    borderClass = 'border-emerald-600';
                    textClass = 'text-white';
                    icon = '✅';
                  } else if (isBooked && isPending) {
                    bgClass = 'bg-amber-50';
                    borderClass = 'border-amber-200';
                    textClass = 'text-amber-600';
                    icon = '⏳';
                  } else if (isBooked && isSubscription) {
                    bgClass = 'bg-violet-50';
                    borderClass = 'border-violet-200';
                    textClass = 'text-violet-700';
                    icon = '🔄';
                  } else if (isBooked) {
                    bgClass = 'bg-red-50';
                    borderClass = 'border-red-200';
                    textClass = 'text-red-600';
                    icon = '🔒';
                  } else {
                    bgClass = 'bg-emerald-50';
                    borderClass = 'border-emerald-200';
                    textClass = 'text-emerald-700';
                    icon = '🟢';
                  }

                  return (
                    <button
                      key={`${slot.start}-${slot.end}`}
                      onClick={() => handleSlotClick(slot)}
                      disabled={isBooked}
                      className={`w-full flex items-center gap-3 px-4 py-3 border-b-0 transition-all duration-200 border-e-4 ${bgClass} ${borderClass} ${
                        isAvailable ? 'hover:brightness-95 active:scale-[0.99] cursor-pointer' : 'cursor-not-allowed opacity-70'
                      }`}
                    >
                      <span className="text-lg shrink-0">{icon}</span>
                      <div className="flex-1 text-start">
                        <span className={`text-sm font-bold ${textClass}`}>
                          {isBooked && slot.booking?.start_time ? `${slot.booking.start_time} — ${slot.booking.end_time}` : `${slot.start} — ${slot.end}`}
                        </span>
                        {isBooked && slot.booking?.status === 'pending' && (
                          <span className="text-[10px] text-amber-500 font-bold block mt-0.5">{'⏳ ' + t('common.pending')}</span>
                        )}
                        {isBooked && slot.booking?.team?.name && slot.booking?.status !== 'pending' && (
                          <span className="text-xs text-gray-500 block mt-0.5">{slot.booking.team.name}</span>
                        )}
                      </div>
                      {isSelected && <Check size={18} className="text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {selectedSlot && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">{t('booking.notes')} ({t('terrain.optional')})</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={t('terrain.notesExample')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
              />
            </div>
          )}

          {error && slots.length > 0 && (
            <p className="text-sm text-red-500 text-center font-bold">{error}</p>
          )}

          {/* Action Button */}
          <button
            onClick={handleSubmitClick}
            disabled={!selectedSlot || submitting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <Check size={18} />
            {t('booking.confirmAndSend')}
          </button>
        </div>
      </div>

      {/* Summary Modal */}
      {showSummary && (
        <BookingSummaryModal
          terrain={terrain}
          slot={selectedSlot}
          date={date}
          flowType={flowType}
          purpose={purpose}
          reservationType={reservationType}
          subscriptionDuration={subscriptionDuration}
          notes={notes}
          onClose={() => setShowSummary(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      )}

      {bookedResult && (
        <WhatsAppNoticeModal
          booking={bookedResult.booking}
          whatsappUrl={bookedResult.whatsappUrl}
          status="submitted"
          onClose={() => {
            setBookedResult(null);
            onBooked();
            onClose();
          }}
        />
      )}
    </div>
  );
}
