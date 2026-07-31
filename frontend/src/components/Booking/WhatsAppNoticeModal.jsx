import { useTranslation } from 'react-i18next';
import { MessageCircle, ExternalLink, X, CalendarDays, Clock, MapPin } from 'lucide-react';

const STATUS_CONFIG = {
  submitted: { emoji: '📤', color: 'emerald' },
  confirmed: { emoji: '✅', color: 'emerald' },
  approved: { emoji: '✅', color: 'emerald' },
  rejected: { emoji: '❌', color: 'red' },
  cancelled: { emoji: '❌', color: 'red' },
};

export default function WhatsAppNoticeModal({ booking, whatsappUrl, status = 'submitted', onClose }) {
  const { t } = useTranslation();
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.submitted;
  const typeLabel = t(`booking.${booking?.booking_type}`, booking?.booking_type);

  const statusLabel = t(`whatsapp.${status === 'submitted' ? 'bookingSubmitted' : status === 'confirmed' || status === 'approved' ? 'bookingConfirmed' : 'bookingCancelled'}`);
  const statusDescription = t(`whatsapp.${status === 'submitted' ? 'submitDescription' : status === 'confirmed' || status === 'approved' ? 'confirmDescription' : 'cancelDescription'}`);

  const handleOpenWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank');
    }
  };

  if (!whatsappUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{t('whatsapp.notificationTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status Banner */}
          <div className={`text-center py-4 rounded-xl ${
            config.color === 'emerald' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            <span className="text-3xl block mb-2">{config.emoji}</span>
            <h3 className={`text-lg font-bold ${config.color === 'emerald' ? 'text-emerald-700' : 'text-red-700'}`}>
              {statusLabel}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{statusDescription}</p>
          </div>

          {/* Booking Summary */}
          {booking && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <MapPin size={14} className="text-gray-400 shrink-0" />
                <span className="font-medium">{booking.terrain?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{typeLabel}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CalendarDays size={14} className="text-gray-400 shrink-0" />
                <span>{booking.booking_date}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={14} className="text-gray-400 shrink-0" />
                <span>{booking.start_time} — {booking.end_time}</span>
              </div>
              {booking.team?.name && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-gray-400">🏟️</span>
                  <span>{t('booking.team')}: <span className="font-medium">{booking.team.name}</span></span>
                </div>
              )}
              {booking.price > 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="text-gray-400">💰</span>
                  <span>{t('booking.price')}: <span className="font-medium">{booking.price} {t('terrain.currency')}</span></span>
                </div>
              )}
            </div>
          )}

          {/* WhatsApp Action Button */}
          <button
            onClick={handleOpenWhatsApp}
            className="w-full flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#20BD5B] text-white font-medium py-3.5 rounded-xl transition shadow-sm"
          >
            <MessageCircle size={20} />
            <span>{t('whatsapp.sendBookingAlert')}</span>
            <ExternalLink size={14} className="opacity-60" />
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium transition"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
