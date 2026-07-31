import { useTranslation } from 'react-i18next';
import { Loader2, X, MessageCircle } from 'lucide-react';

const TYPE_EMOJI = { minifoot: '⚽', salle: '🏟️', grass: '🌿', synthetic: '🟩' };

export default function BookingSummaryModal({ terrain, slot, date, flowType, purpose, reservationType, subscriptionDuration, notes, onClose, onSubmit, submitting }) {
  const { t } = useTranslation();
  const dayNames = [t('weekdays.sunday'), t('weekdays.monday'), t('weekdays.tuesday'), t('weekdays.wednesday'), t('weekdays.thursday'), t('weekdays.friday'), t('weekdays.saturday')];
  const d = new Date(date + 'T00:00:00');
  const dayName = dayNames[d.getDay()];

  const purposeLabel = flowType === 'amical' ? `⚔️ ${t('booking.match')}` : purpose === 'training' ? `🏃 ${t('booking.training')}` : `🔒 ${t('booking.private')}`;
  const reservationLabel = reservationType === 'weekly_subscription'
    ? `🔄 ${t('booking.weeklySubscription')} — ${subscriptionDuration} ${t('booking.month1')}`
    : `📅 ${t('booking.singleReservation')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 scale-100 opacity-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-800">{t('booking.bookingSummary')}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Terrain */}
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <span className="text-2xl">{TYPE_EMOJI[terrain?.type] || '⚽'}</span>
            <div>
              <p className="text-sm font-black text-gray-800">{terrain?.name}</p>
              <p className="text-xs text-gray-500">{terrain?.city}</p>
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <span className="text-lg block mb-1">📅</span>
              <p className="text-xs text-gray-500">{t('booking.dayAndDate')}</p>
              <p className="text-sm font-black text-gray-800">{dayName}</p>
              <p className="text-xs text-gray-600">{date}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl text-center">
              <span className="text-lg block mb-1">⏰</span>
              <p className="text-xs text-gray-500">{t('booking.timeSlot')}</p>
              <p className="text-sm font-black text-gray-800">{slot?.start} — {slot?.end}</p>
            </div>
          </div>

          {/* Type + Reservation */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded-xl text-center">
              <p className="text-xs text-blue-500 mb-1">{t('booking.type')}</p>
              <p className="text-sm font-bold text-blue-800">{purposeLabel}</p>
            </div>
            <div className="p-3 bg-violet-50 rounded-xl text-center">
              <p className="text-xs text-violet-500 mb-1">{t('booking.recurrence')}</p>
              <p className="text-sm font-bold text-violet-800">{reservationLabel}</p>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
              <p className="text-xs text-yellow-600 mb-1">📝 {t('booking.notes')}</p>
              <p className="text-sm text-yellow-800">{notes}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20BD5B] text-white font-black py-4 rounded-xl text-sm transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <MessageCircle size={20} />
            )}
            {submitting ? `${t('common.loading')}...` : t('booking.sendViaWhatsApp')}
          </button>
        </div>
      </div>
    </div>
  );
}
