import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { resolveApiError } from '../../utils/apiError';
import {
  MapPin, Calendar, Clock, Loader2, XCircle, CheckCircle,
  Banknote, AlertTriangle, Shield,
} from 'lucide-react';

const STATUS_BADGE = {
  pending: { label: 'common.pending', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'common.approved', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'common.rejected', color: 'bg-red-100 text-red-600' },
  cancelled: { label: 'common.cancelled', color: 'bg-gray-100 text-gray-500' },
  completed: { label: 'common.completed', color: 'bg-blue-100 text-blue-700' },
};

export default function Reservations() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookRes] = await Promise.all([
        api.get('/manager/bookings'),
      ]);
      setBookings(bookRes.data.bookings || []);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRequestCancel = async () => {
    if (!showCancelModal) return;
    setCancellingId(showCancelModal);
    try {
      await api.post(`/manager/bookings/${showCancelModal}/request-cancel`, {
        reason: cancelReason,
      });
      setShowCancelModal(null);
      setCancelReason('');
      fetchData();
    } catch (err) {
      alert(resolveApiError(err, t));
    } finally { setCancellingId(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">{t('booking.myReservations')}</h2>

      {bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <MapPin className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400">{t('booking.noReservations')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const badge = STATUS_BADGE[b.status] || STATUS_BADGE.pending;
            return (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {b.terrain?.name || t('booking.terrain')}
                      </span>
                      {b.team && (
                        <Shield size={12} className="text-gray-300 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(b.next_date || b.booking_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {b.start_time} - {b.end_time}
                      </span>
                    </div>
                    {b.price > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Banknote size={12} className="text-green-600" />
                        <span className="text-xs font-medium text-green-700">
                          {Number(b.price).toLocaleString('fr-FR')} {t('common.currency')}
                        </span>
                      </div>
                    )}
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${badge.color}`}>
                      {t(badge.label)}
                    </span>
                  </div>

                  {b.status === 'approved' && (
                    <button
                      onClick={() => setShowCancelModal(b.id)}
                      disabled={cancellingId === b.id}
                      className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition flex-shrink-0"
                    >
                      {cancellingId === b.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={14} />
                      )}
                      {t('booking.cancelRequest')}
                    </button>
                  )}

                  {b.status === 'pending' && (
                    <span className="text-xs text-gray-400 italic">{t('booking.awaitingOwner')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCancelModal(null)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-gray-800">{t('booking.cancelRequest')}</h3>
              <button onClick={() => setShowCancelModal(null)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <XCircle size={16} className="text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-600">{t('booking.cancelRequestInfo')}</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('booking.cancelReason')}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelModal(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-50 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRequestCancel}
                disabled={cancellingId === showCancelModal}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
              >
                {cancellingId === showCancelModal ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <AlertTriangle size={14} />
                )}
                {t('booking.sendRequest')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
