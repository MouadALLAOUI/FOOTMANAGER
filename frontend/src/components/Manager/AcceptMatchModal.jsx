import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MapPin, Calendar, Loader2, CheckCircle, MessageCircle } from 'lucide-react';
import api from '../../services/api';

export default function AcceptMatchModal({ match, onClose, onAccepted }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleAccept = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.post(`/manager/match-requests/${match.id}/accept`);
      setSuccess(res.data);
      onAccepted();
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{t('match.acceptedTitle')}</h2>
          <p className="text-gray-500 text-sm mb-6">{t('match.acceptedSubtitle')}</p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-right">
            <div className="text-sm text-gray-500 mb-1">{t('match.managerName')}</div>
            <div className="font-medium text-gray-800 mb-3">{success.host_manager.name}</div>

            <div className="text-sm text-gray-500 mb-1">{t('match.phoneNumber')}</div>
            <div className="font-medium text-gray-800 mb-3" dir="ltr">{success.host_manager.phone}</div>

            {success.host_manager.is_whatsapp && success.host_manager.phone && (
              <a
                href={`https://wa.me/${success.host_manager.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition"
              >
                <MessageCircle size={16} />
                {t('match.contactWhatsApp')}
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  const team = match.host_team;
  const stadium = match.stadium;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{t('match.confirmAcceptTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('match.hostTeam')}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{team?.name}</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {t(`categories.${team?.category}`) || team?.category}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('match.stadiumLabel')}</span>
              <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                <MapPin size={14} className="text-gray-400" />
                {match.custom_terrain_name || `${stadium?.name} — ${stadium?.city}`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('match.dateTimeLabel')}</span>
              <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                <Calendar size={14} className="text-gray-400" />
                {formatDate(match.match_datetime)}{' '}
                {formatTime(match.match_datetime)}
              </span>
            </div>

            {match.notes && (
              <div>
                <span className="text-sm text-gray-500">{t('match.notes')}</span>
                <p className="text-sm text-gray-700 mt-1">{match.notes}</p>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 text-center">
            {t('match.confirmQuestion')}
          </p>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? t('common.submitting') : t('match.confirmAndBook')}
          </button>
        </div>
      </div>
    </div>
  );
}
